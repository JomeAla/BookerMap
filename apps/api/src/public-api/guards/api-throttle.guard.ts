import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiThrottleGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey as { keyId: string; rateLimit: number } | undefined;

    if (!apiKey) return true;

    const now = Date.now();
    const key = apiKey.keyId;
    const limit = apiKey.rateLimit || 100;

    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + 60000 });
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        {
          success: false,
          error: { code: 'RATE_LIMITED', message: `Rate limit exceeded. Try again in ${retryAfter} seconds.` },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
