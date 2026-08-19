import React from 'react'
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { getMyBookings, listTenants } from '../lib/api'
import { getCustomer, getTenantSlug, getToken, clearAuth } from '../lib/auth'
import type { RootStackParamList } from '../navigation/types'
import type { Booking, Tenant } from '../types'
import { formatDateTime } from '../lib/format'
import { colors } from '../theme'
import Button from '../components/Button'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'MyBookingsList'>

export default function MyBookingsScreen({ navigation, route }: Props) {
  const queryClient = useQueryClient()
  const [customer, setCustomerState] = React.useState<any>(null)
  const [slug, setSlug] = React.useState<string | null>(route.params?.tenantSlug || null)
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [hasToken, setHasToken] = React.useState(false)
  const [checking, setChecking] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      const [cust, storedSlug, token] = await Promise.all([getCustomer(), getTenantSlug(), getToken()])
      setCustomerState(cust)
      setHasToken(!!token)
      if (!slug) setSlug(storedSlug)
      try {
        const list = await listTenants()
        setTenants(list || [])
        if (!storedSlug && list?.length === 1) setSlug(list[0].slug)
      } catch {
        // ignore
      }
      setChecking(false)
    })()
  }, [])

  const effectiveSlug = slug || undefined

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-bookings', effectiveSlug],
    queryFn: () => getMyBookings(effectiveSlug as string),
    enabled: !!effectiveSlug && hasToken,
  })

  const onLogout = async () => {
    await clearAuth()
    setCustomerState(null)
    setHasToken(false)
    setSlug(null)
    queryClient.clear()
  }

  const renderLogins = () => (
    <View style={styles.ctaWrap}>
      <Text style={styles.muted}>Choose a business to log in:</Text>
      {tenants.map((t) => (
        <Button
          key={t.id}
          title={t.name}
          variant="outline"
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('PhoneLogin', { tenantSlug: t.slug, tenant: t })}
        />
      ))}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>My Bookings</Text>
        {customer && (
          <Pressable onPress={onLogout}>
            <Text style={styles.logout}>Log out</Text>
          </Pressable>
        )}
      </View>

      {checking ? (
        <Spinner label="Loading..." />
      ) : !hasToken ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Log in to see your bookings.</Text>
          {renderLogins()}
        </View>
      ) : !effectiveSlug ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No business selected yet.</Text>
          {renderLogins()}
        </View>
      ) : isLoading ? (
        <Spinner label="Loading bookings..." />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Could not load bookings.</Text>
          <Button title="Retry" variant="outline" style={styles.ctaBtn} onPress={() => refetch()} />
        </View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(item: Booking) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Booking }) => (
            <Pressable
              style={styles.item}
              onPress={() => navigation.navigate('BookingDetail', { tenantSlug: effectiveSlug, reference: item.reference || item.id })}
            >
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle}>{item.service?.name || 'Booking'}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.itemSub}>{formatDateTime(item.startTime)}</Text>
              {item.reference ? <Text style={styles.itemRef}>Ref: {item.reference}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No bookings yet. Book a service from Home.</Text>}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  logout: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  muted: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  error: {
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaWrap: {
    width: '100%',
    gap: 10,
  },
  ctaBtn: {
    width: '100%',
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
  },
  itemSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  itemRef: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
})