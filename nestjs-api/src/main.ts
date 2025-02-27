import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/utils/error-handling.filter';
import { RequestLoggerInterceptor } from './common/utils/request-logger.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      // Add detailed error messages
      exceptionFactory: (errors) => {
        const messages = errors.map(error => {
          if (error.constraints) {
            return Object.values(error.constraints).join(', ');
          }
          return `Validation failed for ${error.property}`;
        });
        
        console.log('Validation errors:', JSON.stringify(errors));
        return new BadRequestException(messages);
      }
    }),
  );
  
  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Global interceptors
  app.useGlobalInterceptors(new RequestLoggerInterceptor());
  
  // Enable CORS
  app.enableCors();
  
  // We're not setting a global prefix since the Express app might already be configured with /api
  
  // Set up Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Scheduling API')
    .setDescription('Multi-tenant scheduling API for booking appointments')
    .setVersion('1.0')
    .addTag('tenant')
    .addTag('appointments')
    .addTag('employees')
    .addTag('locations')
    .addTag('services')
    .addTag('schedules')
    .addTag('availability')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configure subdomain handling
  app.enableShutdownHooks();
  
  // Configure Express to recognize subdomains with localhost
  const express = app.getHttpAdapter().getInstance();
  express.set('subdomain offset', 1);
  
  // Get port from configuration
  const port = configService.get<number>('port') || 3000;
  
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api`);
}
bootstrap();