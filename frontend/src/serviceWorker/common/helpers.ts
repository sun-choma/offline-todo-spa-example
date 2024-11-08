import { Serializable } from "@/types";

declare let self: ServiceWorkerGlobalScope;
export {};

/**
 * Gets all clients controlled by worker and calls provided handler on them
 * Most commonly used to postMessage to all clients
 * */
export const forEachClient = async (handler: (client: Client) => void) => {
  const clients = await self.clients.matchAll();
  clients.forEach(handler);
};

/**
 * Immutable exclusion of properties, that can't be serialized
 * Communication between worker and client can only use
 */
export const serialize = <Type>(obj: Type): Serializable<Type> => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Immutably tries to retrieve json from response body
 * If failed returns text instead
 */
export const getBody = <T>(res: Response | Request): Promise<T> =>
  res
    .clone()
    .json()
    .catch(() => res.clone().text());

/**
 * Utility function for delays
 * Can be used for throttling to avoid timeouts
 */
export const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Utility function to convert strings to hex code
 * Can be used as id generator
 */
export const toHex = (str: string) => {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
};
