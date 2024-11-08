import { useCallback, useState } from "react";
import { useSyncListener } from "@/hooks/common/useSyncListener.ts";

import { useServiceWorker } from "@/providers/WorkerProvider.tsx";
import { SerializedSyncEntry } from "@/serviceWorker/plugins/queueSync/types.ts";

export function useSyncQueue<Params = unknown>(queueName: string) {
  const { worker } = useServiceWorker();
  const [entries, setEntries] = useState<SerializedSyncEntry<Params>[]>([]);

  useSyncListener<Params>(
    {
      queueName,
      onInit: async (entryList) => {
        setEntries([...entryList]);
      },
      onQueueChange: async () => {
        const entryList = await worker?.getSyncSet<Params>(queueName);
        if (entryList && entryList.length >= 0) {
          setEntries([...entryList]);
        }
      },
    },
    [worker, queueName],
  );

  const refetch = useCallback(() => {
    if (worker) worker.doSyncSet(queueName);
  }, [queueName, worker]);

  return {
    entries,
    isEmpty: entries.length === 0,
    length: entries.length,
    refetch,
  };
}
