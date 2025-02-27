import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const method = request.method;
    const url = request.originalUrl || request.url;
    const tenantId = request.tenant?.id || 'no-tenant';
    const userId = request.user?.sub || 'no-user';
    
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const responseTime = Date.now() - startTime;
        
        this.logger.log(
          `[${tenantId}] [${userId}] ${method} ${url} ${statusCode} - ${responseTime}ms`
        );
      }),
    );
  }
}