type Callback<Params = unknown> = (params: Params) => void;

/**
 * Simple class to manage callback arrays grouped by key
 * Was created as part of implementation of PubSub pattern
 * */
export class Subscriptions<Key = unknown, Params = unknown> {
  private handlers: Map<Key, Callback<Params>[]> = new Map();

  get(key: Key) {
    return this.handlers.get(key) || [];
  }

  add(key: Key, callback: Callback<Params>) {
    const callbacks = this.get(key);
    callbacks.push(callback);
    this.handlers.set(key, callbacks);
  }

  remove(key: Key, callback: Callback<Params>) {
    const callbacks = this.get(key);
    const filtered = callbacks.filter((fn) => fn !== callback);
    if (filtered.length === callbacks.length)
      console.warn(
        "Subscriber wasn't removed. Callback provided doesn't exist",
      );
  }

  // TODO: maybe it's better to add iterator to this class
}
