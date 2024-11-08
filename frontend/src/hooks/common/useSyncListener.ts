import { useEffect } from "react";

import {
  AddPayload,
  ErrorPayload,
  PendingPayload,
  SyncMeta,
  SuccessPayload,
  NotifySyncPayload,
} from "@/serviceWorker/plugins";
import { useServiceWorker } from "@/providers/WorkerProvider.tsx";
import { STATUS as SYNC_STATUS } from "@/serviceWorker/plugins/queueSync/constants.ts";
import { SerializedSyncEntry } from "@/serviceWorker/plugins/queueSync/types.ts";

interface UseSyncListenerParams<Params> {
  queueName: string;
  onAdd?: (params: Pick<AddPayload, "request" | "requestId">) => void;
  // It seems impossible to specify generic with ReturnType, so I wrote type explicitly
  onInit?: (entries: SerializedSyncEntry<Params>[]) => void;
  onSyncStart?: (params: SyncMeta) => void;
  onPending?: (params: Pick<PendingPayload, "request">) => void;
  onSuccess?: (params: Pick<SuccessPayload, "request" | "data">) => void;
  onFailure?: (params: Pick<ErrorPayload, "request" | "error">) => void;
  onUpdate?: (params: SyncMeta) => void;
  onSyncEnd?: (params: SyncMeta) => void;
  onQueueChange?: () => void;
}

export function useSyncListener<Params>(
  params: UseSyncListenerParams<Params>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps?: any[],
) {
  const { worker } = useServiceWorker();

  useEffect(
    () => {
      function handleSyncChange(payload: NotifySyncPayload) {
        switch (payload.status) {
          case SYNC_STATUS.ADD: {
            params?.onAdd?.({
              request: payload.request,
              requestId: payload.requestId,
            });
            params?.onQueueChange?.();
            break;
          }
          case SYNC_STATUS.PENDING:
            if (payload.meta.failed === 0 && payload.meta.succeeded === 0) {
              params.onSyncStart?.(payload.meta);
              params.onUpdate?.(payload.meta);
            }
            params.onPending?.({ request: payload.request });
            params?.onQueueChange?.();
            break;
          case SYNC_STATUS.SUCCESS: {
            const { request, data } = payload;
            params.onSuccess?.({ request, data });
            params.onUpdate?.(payload.meta);
            params?.onQueueChange?.();
            break;
          }
          case SYNC_STATUS.FAIL: {
            const { request, error } = payload;
            params.onFailure?.({ request, error });
            params.onUpdate?.(payload.meta);
            params?.onQueueChange?.();
            break;
          }
        }
        if (payload.status !== SYNC_STATUS.ADD) {
          const { total, succeeded, failed } = payload.meta;

          if (total > 0 && total === succeeded + failed)
            params.onSyncEnd?.(payload.meta);
        }
      }

      worker?.addSyncQueueListener(params.queueName, handleSyncChange);

      async function handleInit() {
        if (params.onInit && worker) {
          const entries = await worker.getSyncSet<Params>(params.queueName);
          params.onInit(entries);
        }
      }

      handleInit();
      return () =>
        worker?.removeSyncQueueListener(params.queueName, handleSyncChange);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...(deps || []), worker],
  );
}
