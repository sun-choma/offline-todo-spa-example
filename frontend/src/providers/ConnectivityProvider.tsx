import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface ConnectivityContext {
  isOnline: boolean;
  isOffline: boolean;
}

const Context = createContext<ConnectivityContext>({
  isOnline: true,
  isOffline: false,
});

/** Provides global connectivity status (online/offline)
 *  Can be used to limit function based on connection */
export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOnline, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const contextValue = useMemo(
    () => ({ isOnline, isOffline: !isOnline }),
    [isOnline],
  );

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

export const useConnectivity = () => useContext(Context);
