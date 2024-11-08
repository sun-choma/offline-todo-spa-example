import { Queue, type QueueOptions } from "workbox-background-sync";

import { sleepMs, toHex } from "@/serviceWorker/common/helpers.ts";
import {
  FailArguments,
  PendingArguments,
  QueueEntry,
  REQUEST_SYNC_STATUS,
  SuccessArguments,
  SyncMeta,
  SyncSetEntry,
} from "./types.ts";

export interface SyncSetOptions extends Omit<QueueOptions, "onSync"> {
  onPending?: (args: PendingArguments) => Promise<void>;
  onSuccess?: (args: SuccessArguments) => Promise<void>;
  onFail?: (args: FailArguments) => Promise<void>;
  parallel?: {
    // If server can handle multiple requests in parallel this option can be set
    // In order to avoid 429 Too Many Requests requestInterval can be provided (in ms)
    requestInterval: number;
  };
}

/**
 * Class to provide more flexible control over Workbox Queue
 * Allows to access current queue items in sync (return only ids)
 * Reflects appropriate state of each entry while queue is being processed
 * Can refetch in parallel or sequentially
 * */
export class SyncSet {
  /** exposed queue entry ids, reflecting current state of the queue
   * (thus providing source of truth for pending operations) */
  public entries: SyncSetEntry[] = [];
  public name: string;
  public size = 0;

  /** queue instance storing actual request data etc. */
  private queue: Queue;

  private readonly onPending: ((args: PendingArguments) => void) | undefined;
  private readonly onSuccess: ((args: SuccessArguments) => void) | undefined;
  private readonly onFail: ((args: FailArguments) => void) | undefined;
  private readonly requestInterval: number | undefined;

  constructor(
    name: string,
    { onSuccess, onFail, onPending, parallel, ...options }: SyncSetOptions,
  ) {
    this.name = name;
    this.queue = new Queue(name, { ...options, onSync: this.sync.bind(this) });
    this.onSuccess = onSuccess;
    this.onFail = onFail;
    this.onPending = onPending;
    this.requestInterval = parallel?.requestInterval;

    /** Init requests from existing queue */
    this.entries = [];
    this.queue.getAll().then((entries) =>
      entries.forEach((e) => {
        const entry = e as QueueEntry;
        this.entries.push({
          requestId: entry.metadata.requestId,
          request: entry.request,
          timestamp: entry.timestamp!,
          status: REQUEST_SYNC_STATUS.STANDBY,
        });
      }),
    );
  }

  async add(request: Request) {
    const requestId = toHex(request.url + Date.now());
    this.entries.push({
      requestId,
      request,
      status: REQUEST_SYNC_STATUS.STANDBY,
      timestamp: Date.now(),
    });
    this.size = this.entries.length;

    await this.queue.pushRequest({
      request,
      metadata: { requestId },
      timestamp: Date.now(),
    });
    return requestId;
  }

  has(requestId: string) {
    return (
      this.entries.findIndex((entry) => entry.requestId === requestId) >= 0
    );
  }

  /** Sync method allows trigger pending background tasks manually */
  async sync() {
    this.entries.forEach((e) => {
      e.status = REQUEST_SYNC_STATUS.STANDBY;
      e.timestamp = Date.now();
    });

    const meta: SyncMeta = {
      total: this.entries.length,
      succeeded: 0,
      failed: 0,
    };

    // Pop all entries from queue
    const entries: QueueEntry[] = [];
    while (true) {
      // using pop due to pop method being generally faster than shift
      const entry = await this.queue.popRequest();
      if (entry) entries.push(entry as QueueEntry);
      else break;
    }
    // reversing entries to preserve original queue items order
    entries.reverse();

    const processEntry = async (entry: QueueEntry) => {
      // Update entries status
      const entryIndex = this.entries.findIndex(
        (e) => e.requestId === entry.metadata.requestId,
      );
      if (entryIndex >= 0) {
        this.entries[entryIndex].status = REQUEST_SYNC_STATUS.PENDING;
        this.entries[entryIndex].timestamp = Date.now();
      }

      this.onPending?.({
        requestId: entry.metadata.requestId,
        timestamp: entry.timestamp!,
        meta: { ...meta },
        entries: this.entries,
        request: entry.request,
      });

      try {
        const response = await fetch(entry.request.clone());
        this.entries = this.entries.filter((_, index) => index !== entryIndex);

        meta.succeeded += 1;
        this.size = this.entries.length;

        this.onSuccess?.({
          requestId: entry.metadata.requestId,
          timestamp: entry.timestamp!,
          meta: { ...meta },
          entries: this.entries,
          response,
          request: entry.request,
        });
      } catch (err) {
        // Return request to retry queue
        await this.queue.pushRequest(entry);
        if (entryIndex >= 0) {
          this.entries[entryIndex].status = REQUEST_SYNC_STATUS.FINISHED;
          this.entries[entryIndex].timestamp = Date.now();
        }

        meta.failed += 1;
        this.size = this.entries.length;

        if (err instanceof Error) {
          this.onFail?.({
            requestId: entry.metadata.requestId,
            timestamp: entry.timestamp!,
            meta: { ...meta },
            entries: this.entries,
            error: err,
            request: entry.request,
          });
        } else throw err;
      }
    };

    if (this.requestInterval !== undefined) {
      // TODO: refine this logic to await all pending requests while preserving request interval
      for (const entry of entries) {
        processEntry(entry);
        await sleepMs(this.requestInterval);
      }
    } else
      for (const entry of entries) {
        await processEntry(entry);
      }
  }

  getAll() {
    return this.entries;
  }
}

// IDEA: implement mechanism, that retries requests on navigator.onLine
//  general algorithm for this feature:
//  1. If backgroundSync is not supported - use retry mechanism (mb its better to add subscription in constructor)
//   a) Subscribe to online/offline events -
//      retry mechanism is to be triggered automatically upon switching to online
//      upon switching to offline - remove timeout and clear retry timer
//   b) delayTimeout is to be stored per request (request failed 3 times (long delay), new request added(short delay))
//      store using Map where keys are entries (or urls?)
//  2. fetchDidFail -> If currently online - try to refetch right away
//  3. If refetch failed anyway - set timeout for retry. With each failed request timeout increases

// IDEA: wrapper around queue to be able to handle single items in queue
