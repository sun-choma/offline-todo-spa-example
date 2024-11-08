/** Messages that can send be sent from worker to client */
export const enum WORKER_MESSAGE_TYPES {
  SYNC_SET_UPDATED = "SYNC_SET_UPDATED",
}

/** Messages that can send be sent from client to worker */
export const enum CLIENT_MESSAGE_TYPES {
  PUT_CACHE = "PUT_CACHE",
  GET_SYNC_SET = "GET_SYNC_SET",
  DO_SYNC_SET = "DO_SYNC_SET",
}

/** Background sync queue keys */
export const enum CACHE_KEYS {
  TODO_POST_QUEUE = "todo-post-queue",
}
