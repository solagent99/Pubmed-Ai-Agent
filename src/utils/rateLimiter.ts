interface RateLimiterOptions {
    maxRequests: number;
    perSeconds: number;
}

export class RateLimiter {
    private queue: Array<{ resolve: () => void }> = [];
    private lastRequestTimes: number[] = [];
    private maxRequests: number;
    private perSeconds: number;

    constructor(options: RateLimiterOptions) {
        this.maxRequests = options.maxRequests;
        this.perSeconds = options.perSeconds;
    }

    async wait(): Promise<void> {
        const now = Date.now();
        this.lastRequestTimes = this.lastRequestTimes.filter(
            time => now - time < this.perSeconds * 1000
        );

        if (this.lastRequestTimes.length >= this.maxRequests) {
            return new Promise<void>(resolve => {
                this.queue.push({ resolve });
            });
        }

        this.lastRequestTimes.push(now);
        this.processQueue();
        return Promise.resolve();
    }

    private processQueue(): void {
        const now = Date.now();
        this.lastRequestTimes = this.lastRequestTimes.filter(
            time => now - time < this.perSeconds * 1000
        );

        while (
            this.queue.length > 0 &&
            this.lastRequestTimes.length < this.maxRequests
        ) {
            const request = this.queue.shift();
            if (request) {
                this.lastRequestTimes.push(now);
                request.resolve();
            }
        }

        if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 1000);
        }
    }
}

// Default rate limiter for PubMed API (3 requests per second)
export const rateLimiter = new RateLimiter({
    maxRequests: 3,
    perSeconds: 1
});
