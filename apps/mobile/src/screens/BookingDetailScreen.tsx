import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { lookupBooking } from '../lib/api'
import { getTenantSlug } from '../lib/auth'
import type { RootStackParamList } from '../navigation/types'
import { formatDateTime, formatCurrency } from '../lib/format'
import { colors } from '../theme'
import Button from '../components/Button'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetail'>

export default function BookingDetailScreen({ navigation, route }: Props) {
  const { reference } = route.params
  const [slug, setSlug] = React.useState<string>(route.params?.tenantSlug || '')

  React.useEffect(() => {
    (async () => {
      if (!slug) {
        const stored = await getTenantSlug()
        if (stored) setSlug(stored)
      }
    })()
  }, [slug])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking', slug, reference],
    queryFn: () => lookupBooking(slug, reference),
    enabled: !!slug,
  })

  const booking = data

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {!slug ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Select a business to look up this booking.</Text>
            <Button title="Back" variant="outline" style={styles.cta} onPress={() => navigation.goBack()} />
          </View>
        ) : isLoading ? (
          <Spinner label="Loading booking..." />
        ) : isError || !booking ? (
          <View style={styles.center}>
            <Text style={styles.error}>Could not find this booking.</Text>
            <Button title="Retry" variant="outline" style={styles.cta} onPress={() => refetch()} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>{booking.service?.name || 'Booking'}</Text>
            <Text style={styles.subtitle}>Ref: {booking.reference}</Text>

            <View style={styles.card}>
              <Row label="Status" value={booking.status} highlight />
              <Row label="When" value={formatDateTime(booking.startTime)} />
              {booking.endTime ? <Row label="Until" value={formatDateTime(booking.endTime)} /> : null}
              {booking.totalPrice ? <Row label="Total" value={formatCurrency(booking.totalPrice)} /> : null}
            </View>

            {booking.customer ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Customer</Text>
                <Row label="Name" value={`${booking.customer.firstName} ${booking.customer.lastName}`.trim()} />
                {booking.customer.phone ? <Row label="Phone" value={booking.customer.phone} /> : null}
                {booking.customer.email ? <Row label="Email" value={booking.customer.email} /> : null}
              </View>
            ) : null}

            {booking.technician ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Technician</Text>
                <Row label="Name" value={`${booking.technician.firstName} ${booking.technician.lastName}`.trim()} />
              </View>
            ) : null}

            {booking.location?.name ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Location</Text>
                <Row label="" value={booking.location.name} />
              </View>
            ) : null}

            {booking.notes ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes</Text>
                <Text style={styles.notes}>{booking.notes}</Text>
              </View>
            ) : null}

            <Button title="Back" variant="ghost" style={styles.cta} onPress={() => navigation.goBack()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      {label ? <Text style={styles.rowLabel}>{label}</Text> : null}
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  rowValueHighlight: {
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  notes: {
    fontSize: 14,
    color: colors.text,
  },
  center: {
    padding: 24,
    alignItems: 'center',
  },
  muted: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    marginTop: 8,
  },
})