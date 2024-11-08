import { Queue } from "workbox-background-sync";
import { Serializable } from "@/types";

import { STATUS } from "./constants";

/** Details on current queue that is being processed */
export interface SyncMeta {
  total: number;
  succeeded: number;
  failed: number;
}

interface NotifyPayloadBase {
  queueName: string;
  status: STATUS;
  request: Serializable<Request>;
}

/** If sync was successful */
export interface SuccessPayload<Data = unknown> extends NotifyPayloadBase {
  meta: SyncMeta;
  status: STATUS.SUCCESS;
  data: Data /* Resolved response body */;
  wasCached?: boolean /**  Was successful request cached or not
   *  This flag is present only if caching was requested */;
}

/** If sync failed */
export interface ErrorPayload extends NotifyPayloadBase {
  meta: SyncMeta;
  status: STATUS.FAIL;
  error: Error /** Error that was thrown as a result of sync */;
}

/** If request failed and was added to sync queue */
export interface AddPayload extends NotifyPayloadBase {
  status: STATUS.ADD;
  requestId: string;
}

/** If sync started and request is being processed */
export interface PendingPayload extends NotifyPayloadBase {
  status: STATUS.PENDING;
  meta: SyncMeta;
}

export type NotifySyncPayload =
  | SuccessPayload
  | ErrorPayload
  | AddPayload
  | PendingPayload;

type WithOriginalRequest<T> = {
  [Key in keyof T]: Key extends "request" ? Request : T[Key];
};
export type NotifyParams = WithOriginalRequest<NotifySyncPayload>;

export type QueueEntry = Exclude<
  Awaited<ReturnType<Queue["popRequest"]>>,
  undefined
> & {
  metadata: {
    requestId: string;
  };
};

export const enum REQUEST_SYNC_STATUS {
  PENDING = "pending",
  STANDBY = "standby",
  FINISHED = "finished",
}

export interface SyncSetEntry {
  requestId: string;
  request: Request;
  status: REQUEST_SYNC_STATUS;
  timestamp: number;
}

export interface PendingArguments {
  requestId: string;
  timestamp: number;
  meta: SyncMeta;
  entries: SyncSetEntry[];
  request: Request;
}

export interface SuccessArguments extends PendingArguments {
  response: Response;
}

export interface FailArguments extends PendingArguments {
  error: Error;
}

export interface SerializedSyncEntry<Payload = unknown>
  extends Serializable<SyncSetEntry> {
  request: Serializable<SyncSetEntry>["request"] & { payload: Payload };
}
