import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { verifyOtp } from '../lib/api'
import { setCustomer, setTenantSlug } from '../lib/auth'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'
import Button from '../components/Button'
import Input from '../components/Input'
import HoneypotTrap from '../components/HoneypotTrap'

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>

export default function OtpVerifyScreen({ navigation, route }: Props) {
  const { tenantSlug, phone } = route.params
  const [code, setCode] = React.useState('')
  const [trapValue, setTrapValue] = React.useState('')

  const mutation = useMutation({
    mutationFn: () => verifyOtp(tenantSlug, { phone, code, website_url: trapValue || undefined }),
    onSuccess: async (result) => {
      if (result.customer) {
        await setCustomer(result.customer)
        await setTenantSlug(tenantSlug)
      }
      navigation.replace('MyBookingsList', { tenantSlug })
    },
    onError: (err: any) => {
      Alert.alert('Verification failed', err.response?.data?.message || 'Invalid code. Please try again.')
    },
  })

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>Sent to {phone}</Text>

          <View style={styles.card}>
            <HoneypotTrap onValue={setTrapValue} />
            <Input
              label="Verification code"
              value={code}
              onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="6-digit code"
              maxLength={6}
            />
            <Button
              title="Verify"
              loading={mutation.isPending}
              disabled={mutation.isPending || code.length !== 6}
              onPress={() => mutation.mutate()}
            />
            <Text style={styles.hint}>In development the code is also shown in the API logs.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
})