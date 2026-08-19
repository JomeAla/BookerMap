import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, Alert } from 'react-native'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { getSlots, createBooking } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import { formatCurrency } from '../lib/format'
import { colors } from '../theme'
import Button from '../components/Button'
import Input from '../components/Input'
import HoneypotTrap from '../components/HoneypotTrap'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingFlow'>

type Step = 'slot' | 'details'

export default function BookingFlowScreen({ navigation, route }: Props) {
  const { tenant, service } = route.params
  const [step, setStep] = React.useState<Step>('slot')
  const [date, setDate] = React.useState('')
  const [time, setTime] = React.useState('')
  const [form, setForm] = React.useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [trapValue, setTrapValue] = React.useState('')

  const today = new Date()
  const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  React.useEffect(() => {
    if (!date) setDate(defaultDate)
  }, [defaultDate, date])

  const { data: slots, isLoading } = useQuery({
    queryKey: ['slots', tenant.slug, service.id, date],
    queryFn: () => getSlots(tenant.slug, service.id, date),
    enabled: !!date,
  })

  const bookingMutation = useMutation({
    mutationFn: () =>
      createBooking(tenant.slug, {
        serviceId: service.id,
        startTime: `${date}T${time}:00.000Z`,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone,
        website_url: trapValue || undefined,
      }),
    onSuccess: (booking) => {
      navigation.replace('BookingConfirmation', { tenantSlug: tenant.slug, reference: booking.reference || booking.id })
    },
    onError: (err: any) => {
      Alert.alert('Booking failed', err.response?.data?.message || 'Something went wrong. Please try again.')
    },
  })

  const handleDateChange = (value: string) => {
    setDate(value)
    setTime('')
  }

  const confirm = () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      Alert.alert('Missing info', 'Please enter your name and phone number.')
      return
    }
    bookingMutation.mutate()
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>{service.name}</Text>
        <Text style={styles.tagline}>
          {service.duration} min · {formatCurrency(service.price, tenant.currency)}
        </Text>

        {step === 'slot' ? (
          <>
            <Text style={styles.stepTitle}>Select date</Text>
            <Input
              value={date}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
            />
            <Text style={styles.stepTitle}>Select time</Text>
            {isLoading ? (
              <Spinner label="Loading slots..." />
            ) : (
              <View style={styles.slotGrid}>
                {(slots || []).map((slot: string) => (
                  <Pressable
                    key={slot}
                    onPress={() => setTime(slot)}
                    style={[styles.slot, time === slot && styles.slotSelected]}
                  >
                    <Text style={[styles.slotText, time === slot && styles.slotTextSelected]}>{slot}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Button
              title="Continue"
              style={styles.cta}
              disabled={!time}
              onPress={() => setStep('details')}
            />
          </>
        ) : (
          <>
            <HoneypotTrap onValue={setTrapValue} />
            <Text style={styles.stepTitle}>Your details</Text>
            <Input label="First name" value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} />
            <Input label="Last name" value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} />
            <Input label="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
            <Input label="Email (optional)" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />

            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Booking summary</Text>
              <Text style={styles.summaryLine}>{service.name} · {service.duration} min</Text>
              <Text style={styles.summaryLine}>{date} at {time}</Text>
              <Text style={styles.summaryPrice}>{formatCurrency(service.price, tenant.currency)}</Text>
            </View>

            <Button title="Continue" style={styles.cta} loading={bookingMutation.isPending} disabled={bookingMutation.isPending} onPress={confirm} />
            <Button title="Back" variant="ghost" onPress={() => setStep('slot')} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  slotSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotText: {
    fontSize: 14,
    color: colors.text,
  },
  slotTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  cta: {
    marginTop: 20,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 8,
  },
})