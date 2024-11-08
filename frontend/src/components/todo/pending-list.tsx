import { VStack } from "@chakra-ui/react";
import { useSyncQueue } from "@/hooks/common/useSyncQueue.ts";
import { CACHE_KEYS } from "@/serviceWorker/common/constants.ts";
import { CreateTodoPayload } from "@/api/todos.ts";
import { PendingItem } from "@/components/todo/pending-item.tsx";
import { Alert } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { REQUEST_SYNC_STATUS } from "@/serviceWorker/plugins/queueSync/types.ts";

export function PendingList() {
  const { entries, isEmpty, refetch } = useSyncQueue<CreateTodoPayload>(
    CACHE_KEYS.TODO_POST_QUEUE,
  );

  return (
    <VStack>
      <VStack maxHeight="265px" padding="12px" overflow="auto">
        {isEmpty && (
          <Alert
            variant="outline"
            colorPalette="gray"
            title="No pending actions at the moment"
          />
        )}
        {!isEmpty &&
          entries.map((entry) => (
            <PendingItem
              key={entry.requestId}
              status="create"
              timestamp={entry.timestamp}
              isLoading={entry.status === REQUEST_SYNC_STATUS.PENDING}
            >
              {entry.request.payload.text}
            </PendingItem>
          ))}
      </VStack>
      <Button onClick={refetch} disabled={isEmpty}>
        {isEmpty ? "No pending actions to retry" : "Retry"}
      </Button>
    </VStack>
  );
}
