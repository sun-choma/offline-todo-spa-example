import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
  CacheOnly,
  Strategy,
  StrategyHandler,
} from "workbox-strategies";
import { QueueSyncPlugin } from "@/serviceWorker/plugins";

type CustomStrategy =
  | NetworkFirst
  | CacheFirst
  | NetworkOnly
  | StaleWhileRevalidate
  | CacheOnly;

/** Wrapper class for workbox strategies, providing additional data to requests
 *  Used to provide metadata regarding successful or failed requests from SW
 *  Ex. for successful request: "was responded from cache?" flag, timestamp
 *      for error: was added to background tasks or not (based on plugins provided)
 * */
export class MetaProvider extends Strategy {
  private readonly strategy: CustomStrategy;

  constructor(strategy: CustomStrategy) {
    super({
      matchOptions: strategy.matchOptions,
      fetchOptions: strategy.fetchOptions,
      plugins: strategy.plugins,
      ...("cacheName" in strategy && { cacheName: strategy.cacheName }),
    });
    this.strategy = strategy;
  }

  private _getTimeSec(dateMs: number) {
    return Math.floor(dateMs / 1000);
  }

  protected async _handle(request: Request, handler: StrategyHandler) {
    const requestTime = this._getTimeSec(Date.now());
    try {
      const response = await this.strategy._handle(request, handler);

      const responseTime = this._getTimeSec(
        new Date(response.headers.get("Date")!).getTime(),
      );
      const isCachedResponse = responseTime < requestTime;

      const payload = await response.clone().json();
      return new Response(
        JSON.stringify({
          ...payload,
          metadata: {
            isCachedResponse,
            timestamp: (responseTime || requestTime) * 1000,
          },
        }),
        {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        // const isNetworkError = error.message.includes("Failed to fetch");

        return new Response(
          JSON.stringify({
            metadata: {
              willRetry: this.strategy.plugins.some(
                (plugin) => plugin instanceof QueueSyncPlugin,
              ),
            },
          }),
          {
            headers: [],
            status: 503,
            statusText: "",
          },
        );
      } else throw error;
    }
  }
}
