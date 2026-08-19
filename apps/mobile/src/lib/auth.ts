import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'bookermap_access_token'
const CUSTOMER_KEY = 'bookermap_customer'
const TENANT_KEY = 'bookermap_tenant_slug'

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function getCustomer() {
  const raw = await AsyncStorage.getItem(CUSTOMER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function setCustomer(customer: unknown): Promise<void> {
  await AsyncStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
}

export async function getTenantSlug(): Promise<string | null> {
  return AsyncStorage.getItem(TENANT_KEY)
}

export async function setTenantSlug(slug: string): Promise<void> {
  await AsyncStorage.setItem(TENANT_KEY, slug)
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, CUSTOMER_KEY, TENANT_KEY])
}