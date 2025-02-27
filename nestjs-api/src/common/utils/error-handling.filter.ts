import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    let message = 'Internal server error';
    let details = null;
    
    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      
      // Handle validation errors
      if (typeof response === 'object' && response !== null) {
        if (response.message) {
          message = response.message;
        }
        
        // Extract validation details
        if (response.message === 'Bad Request Exception' && response.errors) {
          details = response.errors;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }
    
    const tenantId = request.tenant?.id || 'no-tenant';
    const userId = request.user?.sub || 'no-user';
    
    // Log the error
    this.logger.error(
      `[${tenantId}] [${userId}] ${status} ${request.method} ${request.url} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );
    
    // Log validation details if present
    if (details) {
      this.logger.error(`Validation errors: ${JSON.stringify(details)}`);
    }
    
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(details ? { details } : {})
    });
  }
}