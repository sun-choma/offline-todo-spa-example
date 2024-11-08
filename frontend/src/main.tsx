import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Provider } from "@/components/ui/provider.tsx";
import { WorkerProvider } from "@/providers/WorkerProvider.tsx";
import { ConnectivityProvider } from "@/providers/ConnectivityProvider.tsx";
import { Toaster } from "@/components/ui/toaster.tsx";

import App from "./App.tsx";

// By default, network is set to online only (requests are being paused while offline)
// In order to easily test ServiceWorker setting to "always"
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: "always", retry: 0 },
    mutations: { networkMode: "always", retry: 0 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectivityProvider>
        <Provider>
          <WorkerProvider>
            <App />
            <Toaster />
          </WorkerProvider>
        </Provider>
      </ConnectivityProvider>
    </QueryClientProvider>
  </StrictMode>,
);
