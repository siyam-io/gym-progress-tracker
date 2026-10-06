import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window store
const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean expired records every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit?: number; // Maximum requests allowed within window (default: 60)
  windowMs?: number; // Time window in milliseconds (default: 60,000ms = 1 minute)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Extracts client IP from request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Sliding window rate limit checker
 */
export function checkRateLimit(
  req: NextRequest,
  keyPrefix: string = "api",
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60 * 1000;

  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // New window
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, newRecord);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
  };
}
