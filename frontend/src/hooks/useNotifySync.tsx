import { useSyncListener } from "@/hooks/common/useSyncListener.ts";
import { toaster } from "@/components/ui/toaster.tsx";
import { ProgressBar, ProgressRoot } from "@/components/ui/progress.tsx";

// TODO: add setting to customize notification text
export function useNotifySync(queueName: string) {
  useSyncListener({
    queueName,
    onSyncStart: () => {
      toaster.loading({
        id: queueName,
        title: "Updating...",
        description: (
          <ProgressRoot size="xs" variant="subtle" value={0}>
            <ProgressBar />
          </ProgressRoot>
        ),
      });
    },
    onUpdate: (meta) => {
      toaster.update(queueName, {
        title: `Updating ${meta.succeeded + meta.failed}/${meta.total}...`,
        description: (
          <ProgressRoot
            size="xs"
            variant="subtle"
            value={((meta.succeeded + meta.failed) / meta.total) * 100}
          >
            <ProgressBar />
          </ProgressRoot>
        ),
      });
    },
    onSyncEnd: (meta) => {
      const allSucceeded = meta.succeeded === meta.total;
      const allFailed = meta.failed === meta.total;

      const getConfig = () => {
        if (allSucceeded) {
          return {
            type: "success",
            title: "Sync successfully finished!",
          };
        } else if (allFailed) {
          return {
            type: "error",
            title: "Sync request failed",
          };
        } else {
          return {
            type: "info",
            title: `Sync ended, ${meta.succeeded}/${meta.total} requests fulfilled`,
          };
        }
      };

      toaster.update(queueName, {
        ...getConfig(),
        description: "",
      });
    },
  });
}
