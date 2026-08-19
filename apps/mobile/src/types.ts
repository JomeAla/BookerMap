export interface Tenant {
  id: string
  name: string
  slug: string
  logo?: string | null
  primaryColor?: string | null
  timezone?: string | null
  currency?: string | null
}

export interface Service {
  id: string
  name: string
  description?: string | null
  duration: number
  price: number
  priceType?: string
  imageUrl?: string | null
  categoryId?: string | null
  isActive?: boolean
}

export interface Booking {
  id: string
  reference?: string | null
  status: string
  startTime: string
  endTime: string
  totalPrice?: number | null
  notes?: string | null
  customer?: {
    firstName?: string
    lastName?: string
    email?: string | null
    phone?: string
  } | null
  service?: Service | null
  location?: { id: string; name?: string } | null
  technician?: { id: string; firstName?: string; lastName?: string } | null
}

export interface Customer {
  id: string
  email?: string | null
  firstName: string
  lastName: string
  phone: string
}

export interface OtpResponse {
  success: boolean
  message: string
  expiresIn?: number
  devCode?: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: any
  message?: string
  statusCode?: number
}