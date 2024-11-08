import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { setCacheNameDetails } from "workbox-core";
import { registerRoute, setDefaultHandler } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

import { QueueSyncPlugin, RejectFetchPlugin } from "@/serviceWorker/plugins";
import {
  addClientCacheSetter,
  addClientSyncSetGetter,
} from "@/serviceWorker/workbox-extended/window";
import { CACHE_KEYS } from "@/serviceWorker/common/constants.ts";
import { MetaProvider } from "@/serviceWorker/plugins/responseMeta";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: {
    revision: string | null;
    url: string;
  }[];
};
export {};

const VERSION = "v1";

const COMMON_PRECACHE = {
  SERVICE_WORKER_SVG: "/assets/service-worker.svg",
  ROOT_PAGE: "/",
};

/** Since Vite is not running full builds it seems impossible to add dev precache automatically
 * NOTE: Precache may be janky, so it's better to double check in prod version once in a while  */
const DEV_PRECACHE = {
  MAIN: "/src/main.tsx",
  VITE_CLIENT: "/@vite/client",
  REACT_REFRESH: "/@react-refresh",
  WEBMANIFEST: "/manifest.webmanifest",
  VITE_PWA: "/@vite-plugin-pwa/pwa-entry-point-loaded",
  VITE_ENV: "/vite/dist/client/env.mjs",
  VITE_JSX_RUNTIME: "/node_modules/.vite/deps/react_jsx-dev-runtime.js",
  VITE_REACT: "/node_modules/.vite/deps/react.js",
  REACT_DOM: "/node_modules/.vite/deps/react-dom_client.js",
  REACT_QUERY: "/node_modules/.vite/deps/@tanstack_react-query.js",
  WORKER_PROVIDER: "/src/providers/WorkerProvider.tsx",
  CHAKRA_UI_PROVIDER: "/src/components/ui/provider.tsx",
  CHAKRA_UI_REACT: "/node_modules/.vite/deps/@chakra-ui_react.js",
  APP: "/src/App.tsx",
};

setCacheNameDetails({
  prefix: "wb",
  precache: "precache",
  runtime: "runtime",
  suffix: VERSION,
});

/** Includes layer to communicate backgroundSync requests between SW and client */
addClientSyncSetGetter();

/** Includes layer to communicate manual caching between SW and client */
addClientCacheSetter();

/** Automatically handles cache cleanup */
cleanupOutdatedCaches();

precacheAndRoute(
  [
    // All static files will be added to manifest in production automatically (from dist)
    ...self.__WB_MANIFEST,
    // Unique precache entries to be included in prod and dev
    //  it's better to avoid using random UUID in prod. Use build version or file hash ID instead
    ...Object.values(COMMON_PRECACHE).map((url) => ({
      url,
      revision: null,
    })),
    ...(process.env.NODE_ENV === "development"
      ? Object.values(DEV_PRECACHE).map((url) => ({
          url,
          revision: crypto.randomUUID(),
        }))
      : []),
  ],
  {
    urlManipulation: ({ url }) => {
      if (url.href.match(/react\.svg$/i)) {
        return [new URL(COMMON_PRECACHE.SERVICE_WORKER_SVG, url.origin)];
      } else if (url.href.match(/\.(?:tsx?|css|jsx?)\?[tv].*$/i))
        return [new URL(url.pathname, url.origin)];
      else return [url];
    },
  },
);

// TIP: it's better to turn off caching while developing core features
// Caching leads to using stale code which leads to unexpected behaviour and outdated code
setDefaultHandler(
  new NetworkFirst({
    cacheName: "runtime-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
);

/**
 * Route for todos response data
 * Responding with network request while saving response to cache
 * NetworkFirst tries to get fresh data, falling back to cache on fail
 * (fresh data is saved to cache on every fetch)
 */
registerRoute(
  /.*api\/todos(?:\/.+)?$/,
  new MetaProvider(
    new NetworkFirst({
      cacheName: "todo-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 60 * 60 * 24,
        }),
        new RejectFetchPlugin({
          mode: "development",
          rejectOffline: true,
        }),
      ],
    }),
  ),
);

/** Route to handle POST request for /api/todos
 *  MetaProvider adds metadata to provide service worker related info to client
 *  Ex. For successful response: is responded from cache or network, response timestamp etc
 *  NetworkOnly ignores cache completely (don't need to remember responses for post requests in general)
 * */
registerRoute(
  /.*api\/todos$/,
  new MetaProvider(
    new NetworkOnly({
      plugins: [new QueueSyncPlugin(CACHE_KEYS.TODO_POST_QUEUE)],
    }),
  ),
  "POST",
);

/** Message listener to communicate  with main flow of an application */
self.addEventListener("message", async (event) => {
  switch (event.data.type) {
    /** Avoids interrupting users flow, allowing them to trigger update manually */
    case "SKIP_WAITING":
      await self.skipWaiting();
      break;
    default:
      /** Outputting message info to verbose console logs */
      console.debug(`New message: ${JSON.stringify(event.data)}`);
  }
});
