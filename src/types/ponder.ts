export interface PonderCacheData<T> {
  data: T;
  timestamp: number;
  error?: string;
}

export interface PonderFetchOptions {
  forceFetch?: boolean;
}
