import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as crypto from 'crypto';
import { IdempotencyService } from '../idempotency.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotency.decorator';

function computeRequestHash(body: any): string {
  if (!body) return '';
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const isIdempotent = this.reflector.getAllAndOverride<boolean>(IDEMPOTENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isIdempotent) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) {
      return next.handle();
    }

    const requestHash = request.body ? computeRequestHash(request.body) : undefined;

    const cached = await this.idempotencyService.getCached(idempotencyKey, requestHash);

    if (cached) {
      if (cached.conflict) {
        throw new ConflictException('Idempotency key already used for a different request');
      }
      response.status(cached.statusCode);
      return of(cached.data);
    }

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;
        if (statusCode >= 200 && statusCode < 300) {
          this.idempotencyService.cache(idempotencyKey, data, statusCode, 60, requestHash);
        }
        return data;
      }),
    );
  }
}
