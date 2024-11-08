import type { QueueOptions } from "workbox-background-sync";
import type { WorkboxPlugin } from "workbox-core/types";

import {
  getBody,
  forEachClient,
  serialize,
} from "@/serviceWorker/common/helpers";
import { WORKER_MESSAGE_TYPES } from "@/serviceWorker/common/constants";

import { STATUS, SYNC_SETS } from "./constants.ts";
import type { NotifyParams } from "./types.ts";
import { SyncSet, type SyncSetOptions } from "./SyncSet.ts";

declare const self: ServiceWorkerGlobalScope & {
  [SYNC_SETS]: Map<string, SyncSet>;
};

interface QueueSyncPluginParams extends Omit<QueueOptions, "onSync"> {
  cacheName?: string; // Can be provided if refetched request is to be cached
  parallel?: {
    // If server can handle multiple requests in parallel this option can be set
    // In order to avoid 429 Too Many Requests requestInterval van be provided (in ms)
    requestInterval: number;
  };
}

/**
 * Extended version of BackgroundSyncPlugin.
 * Due to BackgroundSyncPlugin queue not being accessible
 * this plugin reimplements the same logic with adding queue status update messages.
 * It also allows customizing refetch behaviour (sequential or parallel)
 * TODO: Timeout-based mechanisms for browsers that don't support background sync
 * */
export class QueueSyncPlugin implements WorkboxPlugin {
  // private readonly queue: Queue;
  private readonly syncSet: SyncSet;

  private readonly cacheName: string | undefined;

  constructor(name: string, options?: QueueSyncPluginParams) {
    this.cacheName = options?.cacheName;

    this.syncSet = new SyncSet(name, {
      ...options,
      onSuccess: this._handleSuccess.bind(this),
      onFail: this._handleFail.bind(this),
      onPending: this._handlePending.bind(this),
      parallel: options?.parallel,
    });

    if (self[SYNC_SETS] === undefined) {
      self[SYNC_SETS] = new Map();
    }
    self[SYNC_SETS].set(name, this.syncSet);
  }

  // TODO: implement type-guarded worker-side notify function
  private _notify(params: NotifyParams) {
    return forEachClient((client) =>
      client.postMessage({
        type: WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED,
        payload: {
          ...params,
          ...("request" in params && { request: serialize(params.request) }),
        },
      }),
    );
  }

  private async _handlePending(
    ...args: Parameters<Exclude<SyncSetOptions["onPending"], undefined>>
  ) {
    const { meta, request } = args[0];
    await this._notify({
      status: STATUS.PENDING,
      meta,
      queueName: this.syncSet.name,
      request,
    });
  }

  private async _handleSuccess(
    ...args: Parameters<Exclude<SyncSetOptions["onSuccess"], undefined>>
  ) {
    const { meta, response, request } = args[0];

    let wasCached = undefined;
    if (this.cacheName) {
      const cache = await self.caches.open(this.cacheName);
      if (cache) {
        await cache.put(request.url, response.clone());
        wasCached = true;
      } else {
        console.error(`Failed to open cache ${this.cacheName}, skipping...`);
        wasCached = false;
      }
    }

    await this._notify({
      status: STATUS.SUCCESS,
      meta: { ...meta },
      queueName: this.syncSet.name,
      request,
      wasCached,
      data: await getBody(response),
    });
  }

  private async _handleFail(
    ...args: Parameters<Exclude<SyncSetOptions["onFail"], undefined>>
  ) {
    const { meta, request, error } = args[0];

    await this._notify({
      status: STATUS.FAIL,
      meta: { ...meta },
      queueName: this.syncSet.name,
      request,
      error,
    });
  }

  /** Workbox plugin method that is being triggered upon failed fetch
   * (errors with statuses 400~,500~ are not considered errors due to promise being resolved successfully)  */
  fetchDidFail: WorkboxPlugin["fetchDidFail"] = async ({ request }) => {
    const requestId = await this.syncSet.add(request);

    // Notify that request failed and was added to background sync queue
    await this._notify({
      status: STATUS.ADD,
      request,
      requestId,
      queueName: this.syncSet.name,
    });
  };
}
