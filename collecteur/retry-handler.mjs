// Gestion des retries avec backoff exponentiel
export class RetryHandler {
  constructor(maxRetries = 5, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async withRetry(fn, onError = null) {
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;

        if ([400, 401, 403, 404].includes(e.status)) {
          throw e;
        }

        const delay = this.baseDelay * Math.pow(2, attempt);

        if (onError) onError(e, attempt, delay);

        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastError;
  }
}

export const retryHandler = new RetryHandler();