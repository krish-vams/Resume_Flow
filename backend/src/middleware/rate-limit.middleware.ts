import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  message: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientKey(request: Request, keyPrefix: string) {
  const userKey = request.user?.id;
  const ipKey = request.ip || request.socket.remoteAddress || "unknown";

  return `${keyPrefix}:${userKey ?? ipKey}`;
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimit(options: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);

    const key = getClientKey(request, options.keyPrefix);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      response.setHeader("Retry-After", retryAfterSeconds);
      response.status(429).json({ message: options.message });
      return;
    }

    next();
  };
}

export const authRateLimit = createRateLimit({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please try again later."
});

export const uploadRateLimit = createRateLimit({
  keyPrefix: "upload",
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: "Too many upload requests. Please try again later."
});

export const expensiveActionRateLimit = createRateLimit({
  keyPrefix: "expensive-action",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many processing requests. Please try again later."
});
