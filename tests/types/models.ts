export interface Location {
  id: string;
  name: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  employeeId: string;
  locationId: string;
  startTime: Date;
  endTime: Date;
  blockType: string;
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
  createdAt: Date;
  updatedAt: Date;
} 