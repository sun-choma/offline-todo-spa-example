import { Workbox } from "workbox-window";

import { Serializable } from "@/types";
import {
  CLIENT_MESSAGE_TYPES,
  WORKER_MESSAGE_TYPES,
} from "@/serviceWorker/common/constants";
import { Subscriptions } from "@/serviceWorker/common/subscriptions";

import {
  ClientMessageData,
  WorkerMessageData,
  WorkerMessageResponse,
} from "./types";
import { SerializedSyncEntry } from "@/serviceWorker/plugins/queueSync/types.ts";

/**
 * Extending basic workbox class to provide better DX
 * Includes several commonly used methods with typeguard
 */
export class WorkboxExtended extends Workbox {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private messageSubs = new Subscriptions<string, any>();
  private syncQueueSubs = new Subscriptions<
    string,
    WorkerMessageData<WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED>["payload"]
  >();

  constructor(...params: ConstructorParameters<typeof Workbox>) {
    super(...params);

    /**
     * Subscribe to messages only once
     * All handlers will be added to pre-defined objects,
     *  which can be called here at any time
     */
    this.addEventListener("message", (event) => {
      const commonHandlers = this.messageSubs.get(event.data.type);

      /** Call all handlers related to message event in general */
      commonHandlers.forEach((handler) => handler(event.data.payload));

      /** Handle callbacks related to specific(system-level) message events */
      switch (event.data.type) {
        /** Handle callbacks related to changes in background sync */
        case WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED: {
          const eventData: WorkerMessageData<WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED> =
            event.data;
          const handlers = this.syncQueueSubs.get(eventData.payload.queueName);
          handlers.forEach((handler) => handler(event.data.payload));
          break;
        }
        default:
          console.debug(`Worker fired message with type "${event.data.type}" `);
          break;
      }
    });
  }

  /** Provides typings for messages */
  messageSW<Type extends string>(
    data: Serializable<ClientMessageData<Type>>,
  ): Promise<
    Type extends keyof WorkerMessageResponse
      ? WorkerMessageResponse[Type]
      : unknown
  > {
    return super.messageSW(data);
  }

  /**
   * Simplified way to subscribe to messages - main way to communicate with SW
   * Included type guard significantly improves DX
   */
  addMessageListener<Type extends string>(
    messageType: Type,
    func: (payload: WorkerMessageData<Type>["payload"]) => void,
  ) {
    this.messageSubs.add(messageType, func);
  }

  /**
   * Removes message subscription the same way as removeEventListener
   */
  removeMessageListener<Type extends string>(
    messageType: Type,
    func: (payload: WorkerMessageData<Type>["payload"]) => void,
  ) {
    this.messageSubs.remove(messageType, func);
  }

  /**
   * Adds subscription to specific syncQueue updates
   */
  addSyncQueueListener(
    queueName: string,
    callback: (
      payload: WorkerMessageData<WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED>["payload"],
    ) => void,
  ) {
    this.syncQueueSubs.add(queueName, callback);
  }

  /**
   * Removes subscription to specific syncQueue updates
   */
  removeSyncQueueListener(
    queueName: string,
    callback: (
      payload: WorkerMessageData<WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED>["payload"],
    ) => void,
  ) {
    this.syncQueueSubs.remove(queueName, callback);
  }

  /**
   * Gets current syncSet entries
   */
  getSyncSet<Payload = unknown>(queueName: string) {
    return this.messageSW({
      type: CLIENT_MESSAGE_TYPES.GET_SYNC_SET,
      payload: { queueName },
    }) as Promise<SerializedSyncEntry<Payload>[]>;
  }

  /**
   * Triggers sync manually from client side
   */
  doSyncSet(queueName: string) {
    return this.messageSW({
      type: CLIENT_MESSAGE_TYPES.DO_SYNC_SET,
      payload: { queueName },
    }) as Promise<void>;
  }

  /**
   * Caches client-side provided data. It may fail, so it's supposed to be using with "try" and "catch"
   *  Ex. When receiving preloaded data from server
   *      along with other data in single requests
   */
  putCache(
    payload: ClientMessageData<CLIENT_MESSAGE_TYPES.PUT_CACHE>["payload"],
  ) {
    this.messageSW({
      type: CLIENT_MESSAGE_TYPES.PUT_CACHE,
      payload,
    });
  }
}
