import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './modules/tenant/tenant.module';
import { CommonModule } from './common/common.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ServicesModule } from './modules/services/services.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    TenantModule,
    AppointmentsModule,
    EmployeesModule,
    LocationsModule,
    ServicesModule,
    SchedulesModule,
    AvailabilityModule,
    AdminModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}