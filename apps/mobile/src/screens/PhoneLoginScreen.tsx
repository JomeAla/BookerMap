import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { requestOtp } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'
import Button from '../components/Button'
import Input from '../components/Input'
import HoneypotTrap from '../components/HoneypotTrap'

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneLogin'>

export default function PhoneLoginScreen({ navigation, route }: Props) {
  const { tenantSlug } = route.params
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [channel, setChannel] = React.useState<'SMS' | 'BOTH'>('SMS')
  const [trapValue, setTrapValue] = React.useState('')

  const mutation = useMutation({
    mutationFn: () => requestOtp(tenantSlug, { phone, email: email || undefined, channel, website_url: trapValue || undefined }),
    onSuccess: () => {
      navigation.navigate('OtpVerify', { tenantSlug, phone })
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Could not send OTP. Please try again.')
    },
  })

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>We'll send you a one-time code to verify your number.</Text>

          <View style={styles.card}>
            <HoneypotTrap onValue={setTrapValue} />
            <Input
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. 08012345678"
            />
            <Input
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="for email delivery as well"
            />

            <View style={styles.choiceRow}>
              <Text style={styles.choiceLabel}>Deliver code via</Text>
              <View style={styles.choiceGroup}>
                <Button
                  title="SMS"
                  variant={channel === 'SMS' ? 'primary' : 'ghost'}
                  style={styles.choiceBtn}
                  onPress={() => setChannel('SMS')}
                />
                <Button
                  title="SMS + Email"
                  variant={channel === 'BOTH' ? 'primary' : 'ghost'}
                  style={styles.choiceBtn}
                  onPress={() => setChannel('BOTH')}
                />
              </View>
            </View>

            <Button
              title="Send code"
              loading={mutation.isPending}
              disabled={mutation.isPending || !phone.trim()}
              onPress={() => mutation.mutate()}
              style={styles.cta}
            />
          </View>
        </ScrollView>
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
  choiceRow: {
    marginTop: 4,
  },
  choiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  choiceGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    height: 40,
  },
  cta: {
    marginTop: 20,
  },
})