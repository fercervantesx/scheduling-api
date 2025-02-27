import { Module } from '@nestjs/common';
import { AdminTenantsService } from './services/admin-tenants.service';
import { AdminTenantsController } from './controllers/admin-tenants.controller';

@Module({
  controllers: [AdminTenantsController],
  providers: [AdminTenantsService],
  exports: [AdminTenantsService],
})
export class AdminModule {}