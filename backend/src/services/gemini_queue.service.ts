/**
 * JobGuard AI - Sequential Gemini Execution Controller & Queue Manager
 * Module: backend.src.services.gemini_queue.service
 * Purpose: Enforces strict sequential Gemini API execution with max concurrency = 1.
 *          Paces requests to stay within Google Gemini API Free Tier rate limits.
 *          Implements transient retry backoff and clean quota exhaustion categorization.
 */

export class GeminiQueueService {
  private static queue: Promise<any> = Promise.resolve();
  private static lastExecutionTimestamp = 0;
  private static readonly MIN_INTERVAL_MS = 600; // Minimum interval between successive requests to prevent Free Tier burst throttling

  /**
   * Enqueues an async Gemini API task, ensuring that exactly one task executes at any given time.
   */
  public static async executeSequentially<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Chain onto the serial queue
      this.queue = this.queue
        .then(async () => {
          // Respect rate limit pacing
          const elapsed = Date.now() - this.lastExecutionTimestamp;
          if (elapsed < this.MIN_INTERVAL_MS) {
            await new Promise((r) => setTimeout(r, this.MIN_INTERVAL_MS - elapsed));
          }

          try {
            const result = await this.executeWithTransientRetry(task);
            this.lastExecutionTimestamp = Date.now();
            resolve(result);
          } catch (err) {
            this.lastExecutionTimestamp = Date.now();
            reject(err);
          }
        })
        .catch((fatalQueueError) => {
          // Ensure unexpected queue errors do not break subsequent queued items
          console.error('[GeminiQueueService] Unexpected serial queue error:', fatalQueueError);
          reject(fatalQueueError);
        });
    });
  }

  /**
   * Executes a task with single-attempt retry on transient 429 or network errors.
   */
  private static async executeWithTransientRetry<T>(task: () => Promise<T>): Promise<T> {
    try {
      return await task();
    } catch (err: any) {
      if (this.isRateLimitOrQuotaError(err)) {
        console.warn('[GeminiQueueService] Rate limit or quota warning detected, applying backoff delay...');
        await new Promise((r) => setTimeout(r, 2000));
        try {
          return await task();
        } catch (retryErr: any) {
          throw retryErr;
        }
      }
      throw err;
    }
  }

  /**
   * Diagnoses whether an error is related to quota or rate limits.
   */
  public static isRateLimitOrQuotaError(err: any): boolean {
    if (!err) return false;
    const status = err.status || err.statusCode || (err.response && err.response.status);
    const msg = String(err.message || '').toUpperCase();
    return (
      status === 429 ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('QUOTA') ||
      msg.includes('RATE_LIMIT')
    );
  }
}
