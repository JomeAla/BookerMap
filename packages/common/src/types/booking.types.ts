export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_SERVICE = 'IN_SERVICE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

export interface IBooking {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  technicianId?: string;
  territoryId?: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  price: number;
  discount?: number;
  total: number;
  notes?: string;
  addressId?: string;
  isRecurring: boolean;
  recurringBookingId?: string;
  canceledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IRecurringBooking {
  id: string;
  tenantId: string;
  customerId: string;
  serviceId: string;
  frequency: RecurringFrequency;
  interval: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startDate: string;
  endDate?: string;
  timeOfDay: string;
  price: number;
  addressId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDispatch {
  id: string;
  bookingId: string;
  technicianId: string;
  status: JobStatus;
  assignedAt: string;
  acceptedAt?: string;
  enRouteAt?: string;
  onSiteAt?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export enum JobStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SITE = 'ON_SITE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface CreateBookingDto {
  customerId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  price: number;
  discount?: number;
  notes?: string;
  addressId?: string;
  technicianId?: string;
  territoryId?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringInterval?: number;
}

export interface UpdateBookingDto {
  status?: BookingStatus;
  scheduledDate?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  technicianId?: string;
  price?: number;
  discount?: number;
  notes?: string;
  cancelReason?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  customerId?: string;
  technicianId?: string;
  tenantId?: string;
  territoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
