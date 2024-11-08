import { SYNC_SETS } from "@/serviceWorker/plugins";

import { CLIENT_MESSAGE_TYPES } from "@/serviceWorker/common/constants";
import { getBody, serialize } from "@/serviceWorker/common/helpers";

import { SyncSet } from "@/serviceWorker/plugins/queueSync/SyncSet.ts";

import { ClientMessageEvent } from "./types";

/**
 * It seems like it's needed to redeclare self type locally to extend it with appropriate types
 * (would prefer to do this globally once, will try to find a way)
 */
declare const self: ServiceWorkerGlobalScope & {
  addEventListener: (
    type: "message",
    fn: (event: ClientMessageEvent) => void,
  ) => void;
  [SYNC_SETS]: Map<string, SyncSet>;
  /** Sync queue entries are saved as part of self
   *  using Symbol ensures, that none of the existing key won't be replaced */
};

/**
 * Adds handler for client-side sync queue requests
 */
// TODO: maybe it's better to have generic map of subscribers to be called on message
//  this way there will be single subscription to "message" event
export function addClientSyncSetGetter() {
  // IDEA: add functions to be able remove or sync individual requests
  self.addEventListener("message", async (event) => {
    switch (event.data.type) {
      case CLIENT_MESSAGE_TYPES.GET_SYNC_SET: {
        const { queueName } = event.data.payload;
        const syncSet = self[SYNC_SETS].get(queueName);
        if (syncSet) {
          const entries = syncSet.getAll();
          const response = entries.map(async (entry) => ({
            ...entry,
            request: {
              ...entry.request,
              payload: await getBody(entry.request),
            },
          }));
          event.ports[0].postMessage(await Promise.all(response));
        } else {
          event.ports[0].postMessage(undefined);
        }
        break;
      }
      case CLIENT_MESSAGE_TYPES.DO_SYNC_SET: {
        const { queueName } = event.data.payload;
        const syncSet = self[SYNC_SETS].get(queueName);
        if (syncSet) {
          await syncSet.sync();
        } else {
          throw new Error(
            `Unable to manually sync set: "${queueName}". Set not found`,
          );
        }
        break;
      }
    }
  });
}

/**
 * Adds handler for caching data provided by client side
 */
export function addClientCacheSetter() {
  self.addEventListener("message", async (event) => {
    if (event.data.type === CLIENT_MESSAGE_TYPES.PUT_CACHE) {
      const { cacheName, url, data } = event.data.payload;
      const cache = await self.caches.open(cacheName);
      if (cache) {
        await cache.put(url, new Response(serialize(data) as BodyInit));
      } else throw new Error(`Cache with name ${cacheName} does not exist`);
    }
  });
}
