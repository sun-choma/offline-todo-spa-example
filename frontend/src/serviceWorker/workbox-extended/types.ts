import {
  CLIENT_MESSAGE_TYPES,
  WORKER_MESSAGE_TYPES,
} from "@/serviceWorker/common/constants";
import { NotifySyncPayload } from "@/serviceWorker/plugins";
import { SerializedSyncEntry } from "@/serviceWorker/plugins/queueSync/types.ts";

type ClientMessagePayloads = {
  [CLIENT_MESSAGE_TYPES.PUT_CACHE]: {
    cacheName: string;
    url: string;
    data: object;
  };
  [CLIENT_MESSAGE_TYPES.GET_SYNC_SET]: {
    queueName: string;
  };
  [CLIENT_MESSAGE_TYPES.DO_SYNC_SET]: {
    queueName: string;
  };
};

type WorkerMessagePayloads = {
  [WORKER_MESSAGE_TYPES.SYNC_SET_UPDATED]: NotifySyncPayload;
};

// NOTE: Types below are generics and being calculated automatically
//  Adjustments are to be done to types above
export interface ClientMessageData<Type extends string> {
  type: Type;
  payload: Type extends keyof ClientMessagePayloads
    ? ClientMessagePayloads[Type]
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any;
}

export interface WorkerMessageData<Type extends string> {
  type: Type;
  payload: Type extends keyof WorkerMessagePayloads
    ? WorkerMessagePayloads[Type]
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any;
}

export interface WorkerMessageResponse {
  [CLIENT_MESSAGE_TYPES.GET_SYNC_SET]: SerializedSyncEntry[];
}

// Gets all combinations of client-sent message events
type MessageEvents<Payloads> = {
  [Key in keyof Payloads]: {
    type: Key;
    payload: Payloads[Key];
  };
}[keyof Payloads];

export interface ClientMessageEvent extends ExtendableMessageEvent {
  data: MessageEvents<ClientMessagePayloads>;
}

export interface WorkerMessageEvent extends ExtendableMessageEvent {
  data: MessageEvents<WorkerMessagePayloads>;
}
