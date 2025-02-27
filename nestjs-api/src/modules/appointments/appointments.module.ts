import { Module } from '@nestjs/common';
import { AppointmentsService } from './services/appointments.service';
import { AppointmentsController } from './controllers/appointments.controller';
import { PastAppointmentProcessorService } from './cron/past-appointment-processor.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PastAppointmentProcessorService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}