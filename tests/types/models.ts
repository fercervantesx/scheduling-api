export interface Location {
  id: string;
  name: string;
  address: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  employeeId: string;
  locationId: string;
  startTime: string;
  endTime: string;
  blockType: string;
  weekday: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  serviceId: string;
  locationId: string;
  employeeId: string;
  startTime: Date;
  status: string;
  canceledBy: string | null;
  cancelReason: string | null;
  tenantId: string;
  bookedBy: string;
  bookedByName: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
} 