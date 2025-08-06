import { AsyncLocalStorage } from 'async_hooks';

export interface RequestHeaders {
  [key: string]: string | string[] | undefined;
}

/**
 * Global store for request headers using AsyncLocalStorage
 * This allows accessing headers throughout the request lifecycle
 */
class HeadersStore {
  private asyncLocalStorage = new AsyncLocalStorage<RequestHeaders>();

  /**
   * Set headers for the current request context
   * @param headers - Request headers
   */
  setHeaders(headers: RequestHeaders): void {
    this.asyncLocalStorage.enterWith(headers);
  }

  /**
   * Get headers from the current request context
   * @returns Request headers or undefined if no context
   */
  getHeaders(): RequestHeaders | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Check if No-Cache header is present
   * @returns true if cache should be bypassed
   */
  shouldSkipCache(): boolean {
    const headers = this.getHeaders();
    if (!headers) return false;

    return 'No-Cache' in headers || 'no-cache' in headers;
  }

  /**
   * Run a function within a headers context
   * @param headers - Request headers
   * @param fn - Function to run
   * @returns Promise result of the function
   */
  async runWithHeaders<T>(headers: RequestHeaders, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(headers, fn);
  }
}

// Export singleton instance
export const headersStore = new HeadersStore();
