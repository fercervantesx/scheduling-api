import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantController } from './controllers/tenant.controller';
import { SupabaseService } from '../../common/services/supabase.service';

@Module({
  providers: [TenantService, SupabaseService],
  controllers: [TenantController],
  exports: [TenantService],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'raw-debug', method: RequestMethod.GET },
        { path: 'admin*', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}