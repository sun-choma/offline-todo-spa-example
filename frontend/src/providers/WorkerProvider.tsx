import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { WorkboxExtended } from "@/serviceWorker/workbox-extended";
import { WorkboxLifecycleEvent } from "workbox-window";

type WorkboxInstance = WorkboxExtended | undefined;

interface WorkerContext {
  worker: WorkboxInstance;
}

const Context = createContext<WorkerContext>({
  worker: undefined,
});

function updateWorker(sw: WorkboxExtended, isInitial = false) {
  function handleSkipWaiting() {
    sw.messageSkipWaiting();
  }

  function handleRefresh() {
    window.location.reload();
  }

  const accepted = confirm(
    `${isInitial ? "Application is ready to be used offline." : "New version of the app is available."} Refresh to apply changes`,
  );

  if (accepted) (isInitial ? handleRefresh : handleSkipWaiting)();
}

/** Provides service worker for additional subscriptions/messages in components
 *  If SW is not supported undefined will be returned */
export function WorkerProvider({ children }: { children: ReactNode }) {
  const [worker, setWorker] = useState<WorkboxInstance>();
  const isRefreshing = useRef(false);

  const contextValue = useMemo(
    () => ({
      worker,
    }),
    [worker],
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const sw = new WorkboxExtended(
        import.meta.env.MODE === "production" ? "/sw.js" : "/dev-sw.js?dev-sw",
        {
          type: "module",
          scope: "/",
        },
      );
      setWorker(sw);

      // Handle initial installation of service worker
      const handleInstalled = (event: WorkboxLifecycleEvent) => {
        if (!event.isUpdate) {
          updateWorker(sw, true);
        }
      };
      sw.addEventListener("installed", handleInstalled);

      // If service worker is ready, but waiting to activate - prompt user to trigger update
      const handleWaiting = () => {
        console.log("Service worker is waiting");
        updateWorker(sw);
      };
      sw.addEventListener("waiting", handleWaiting);

      // Controlling SW has changed (due to skipWaiting() triggered by user), refresh page to apply changes
      const handleControlling = () => {
        console.log("Controlling SW changed, refreshing...");
        if (!isRefreshing.current) {
          window.location.reload();
          isRefreshing.current = true;
        }
      };
      sw.addEventListener("controlling", handleControlling);

      // TODO: handle failed registration
      sw.register();

      return () => {
        sw.removeEventListener("installed", handleInstalled);
        sw.removeEventListener("waiting", handleWaiting);
        sw.removeEventListener("controlling", handleControlling);
      };
    }
  }, []);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export const useServiceWorker = () => useContext(Context);
