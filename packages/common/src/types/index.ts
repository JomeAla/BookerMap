export * from './booking.types';
export * from './payment.types';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  DISPATCHER = 'DISPATCHER',
  TECHNICIAN = 'TECHNICIAN',
  CUSTOMER = 'CUSTOMER',
}

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  settings?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tenantId: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ICustomerAddress {
  id: string;
  customerId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip?: string;
  country: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IService {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  categoryId: string;
  tenantId: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IServiceCategory {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IServiceModifier {
  id: string;
  serviceId: string;
  name: string;
  description?: string;
  price: number;
  isRequired: boolean;
  sortOrder?: number;
}

export interface IIntakeField {
  id: string;
  serviceId: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'FILE' | 'DATE';
  required: boolean;
  options?: string[];
  placeholder?: string;
  sortOrder?: number;
}

export interface ITerritory {
  id: string;
  name: string;
  tenantId: string;
  color?: string;
  isActive: boolean;
  geometry?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ITerritoryService {
  id: string;
  territoryId: string;
  serviceId: string;
  price?: number;
  isAvailable: boolean;
}

export interface INotification {
  id: string;
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface IAiConversation {
  id: string;
  tenantId: string;
  userId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IAiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface IAiResponse {
  id: string;
  messageId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  response: string;
  createdAt: string;
}

export interface IRefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface IWebhook {
  id: string;
  tenantId: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
};

export interface CreateTenantDto {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export interface UpdateTenantDto {
  name?: string;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  settings?: Record<string, unknown>;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  tenantId?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tenantName?: string;
  tenantSlug?: string;
}

export interface AuthResponse {
  user: IUser;
  tenant: ITenant;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateAddressDto {
  label: string;
  street: string;
  city: string;
  state: string;
  zip?: string;
  country: string;
  lat?: number;
  lng?: number;
  isDefault?: boolean;
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  duration: number;
  price: number;
  categoryId: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface CreateTerritoryDto {
  name: string;
  color?: string;
  geometry?: Record<string, unknown>;
}

export interface AssignServiceToTerritoryDto {
  territoryId: string;
  serviceId: string;
  price?: number;
}

export interface SendNotificationDto {
  userId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface CreateWebhookDto {
  url: string;
  events: string[];
  secret?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
