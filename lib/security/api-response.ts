import { NextResponse } from "next/server";
import { RateLimitResult } from "./rate-limit";

export interface ApiResponseOptions {
  status?: number;
  rateLimit?: RateLimitResult;
}

export function apiSuccess<T>(data: T, options: ApiResponseOptions = {}) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (options.rateLimit) {
    headers.set("X-RateLimit-Limit", options.rateLimit.limit.toString());
    headers.set("X-RateLimit-Remaining", options.rateLimit.remaining.toString());
    headers.set("X-RateLimit-Reset", Math.ceil(options.rateLimit.resetTime / 1000).toString());
  }

  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status: options.status ?? 200,
      headers,
    }
  );
}

export function apiError(
  message: string,
  statusCode: number = 400,
  details?: unknown,
  rateLimit?: RateLimitResult
) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (rateLimit) {
    headers.set("X-RateLimit-Limit", rateLimit.limit.toString());
    headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    headers.set("X-RateLimit-Reset", Math.ceil(rateLimit.resetTime / 1000).toString());
  }

  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(details ? { details } : {}),
    },
    {
      status: statusCode,
      headers,
    }
  );
}
