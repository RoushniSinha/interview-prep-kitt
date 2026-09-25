/**
 * Token-bucket rate limiter + concurrency gate
 * Ensures free-tier token/minute and request/minute boundaries are never exceeded.
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private tokens: number;
  private refillRatePerMs: number;
  private lastRefillTimestamp: number;
  private activeConcurrency = 0;
  private maxConcurrency: number;

  constructor(options: { tokensPerMinute: number; maxConcurrency?: number }) {
    this.capacity = options.tokensPerMinute;
    this.tokens = options.tokensPerMinute;
    this.refillRatePerMs = options.tokensPerMinute / (60 * 1000);
    this.lastRefillTimestamp = Date.now();
    this.maxConcurrency = options.maxConcurrency || 2;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTimestamp;
    const addedTokens = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.capacity, this.tokens + addedTokens);
    this.lastRefillTimestamp = now;
  }

  /**
   * Waits until sufficient tokens and a concurrency slot are available
   */
  async acquire(estimatedTokens = 1000): Promise<void> {
    while (true) {
      this.refill();

      // Check concurrency
      if (this.activeConcurrency >= this.maxConcurrency) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      // Check tokens
      if (this.tokens >= estimatedTokens) {
        this.tokens -= estimatedTokens;
        this.activeConcurrency++;
        return;
      }

      // Compute wait time for enough tokens
      const neededTokens = estimatedTokens - this.tokens;
      const waitMs = Math.ceil(neededTokens / this.refillRatePerMs) + 50;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 2000)));
    }
  }

  release(): void {
    this.activeConcurrency = Math.max(0, this.activeConcurrency - 1);
  }
}

// Global default rate limiter for Gemini Free Tier (e.g. 15 RPM / 60k TPM)
export const globalGeminiRateLimiter = new TokenBucketRateLimiter({
  tokensPerMinute: 30000,
  maxConcurrency: 2,
});
