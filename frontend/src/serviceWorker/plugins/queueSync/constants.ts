export const enum STATUS {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAIL = "FAIL",
  ADD = "ADD",
}

export const SYNC_SETS = Symbol(
  "Symbol for storage of all sync queries registered in service worker",
);
