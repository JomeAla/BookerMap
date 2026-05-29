import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && data.meta) {
          const { meta, ...rest } = data;
          return { success: true, data: rest, meta };
        }
        if (data && data.data !== undefined && data.meta !== undefined) {
          return { success: true, data: data.data, meta: data.meta };
        }
        return { success: true, data };
      }),
    );
  }
}
