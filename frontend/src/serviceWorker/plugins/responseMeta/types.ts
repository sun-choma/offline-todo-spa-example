export interface SuccessfulResponseMeta {
  isCachedResponse: boolean;
  timestamp: number;
}

export interface ErrorResponseMeta {
  willRetry: boolean;
}

/** Every request that comes from a route with MetaProvided has the following shape
 *  WARN: in order for this to work properly server is supposed to return object/dict as response */
export type WorkerData<Payload extends object> = Payload & {
  metadata?: SuccessfulResponseMeta;
};

/** In case of error only metadata is being provided */
export interface WorkerError {
  metadata?: ErrorResponseMeta;
}
