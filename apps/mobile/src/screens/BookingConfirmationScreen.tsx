import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { lookupBooking } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import { formatDateTime, formatCurrency } from '../lib/format'
import { colors } from '../theme'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmation'>

export default function BookingConfirmationScreen({ navigation, route }: Props) {
  const { tenantSlug, reference } = route.params

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking', tenantSlug, reference],
    queryFn: () => lookupBooking(tenantSlug, reference),
    enabled: !!reference,
  })

  const booking = data

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.check}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>Keep your reference handy</Text>

        {isLoading ? (
          <Spinner label="Loading booking..." />
        ) : isError || !booking ? (
          <Text style={styles.error}>Could not load booking details.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.referenceLabel}>Reference</Text>
            <Text style={styles.reference}>{booking.reference}</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Service</Text>
              <Text style={styles.rowValue}>{booking.service?.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>When</Text>
              <Text style={styles.rowValue}>{formatDateTime(booking.startTime)}</Text>
            </View>
            {booking.totalPrice ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Total</Text>
                <Text style={styles.rowValue}>{formatCurrency(booking.totalPrice)}</Text>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          style={styles.link}
          onPress={() => navigation.navigate('BookingLookup', { tenantSlug })}
        >
          <Text style={styles.linkText}>Look up another booking</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => navigation.navigate('Main')}>
          <Text style={styles.linkText}>Back to home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  checkIcon: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  referenceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reference: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
})