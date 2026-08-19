import React from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { listTenants } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import type { Tenant } from '../types'
import { colors } from '../theme'
import Button from '../components/Button'
import Input from '../components/Input'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingLookup'>

export default function BookingLookupScreen({ navigation, route }: Props) {
  const [slug, setSlug] = React.useState<string>(route.params?.tenantSlug || '')
  const [reference, setReference] = React.useState('')
  const [tenants, setTenants] = React.useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = React.useState(true)

  React.useEffect(() => {
    (async () => {
      try {
        const list = await listTenants()
        setTenants(list || [])
        if (!slug && list?.length === 1) setSlug(list[0].slug)
      } catch {
        // ignore
      }
      setLoadingTenants(false)
    })()
  }, [slug])

  const lookup = () => {
    if (!slug) {
      Alert.alert('Select a business', 'Please choose a business first.')
      return
    }
    const ref = reference.trim().toUpperCase()
    if (!ref) {
      Alert.alert('Enter reference', 'Please enter the booking reference (e.g. BM-XXXXXXX).')
      return
    }
    navigation.navigate('BookingDetail', { tenantSlug: slug, reference: ref })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Find a booking</Text>
        <Text style={styles.subtitle}>Enter your booking reference to see its details.</Text>

        <View style={styles.card}>
          {loadingTenants ? (
            <Spinner label="Loading businesses..." />
          ) : (
            <>
              <Text style={styles.label}>Business</Text>
              {tenants.map((t) => (
                <Button
                  key={t.id}
                  title={t.name}
                  variant={slug === t.slug ? 'primary' : 'outline'}
                  style={styles.tenantBtn}
                  onPress={() => setSlug(t.slug)}
                />
              ))}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Input
            label="Booking reference"
            value={reference}
            onChangeText={(v) => setReference(v.toUpperCase())}
            placeholder="BM-XXXXXXX"
            autoCapitalize="characters"
          />
          <Button title="Look up" onPress={lookup} />
        </View>
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
    paddingTop: 32,
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
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  tenantBtn: {
    width: '100%',
    marginBottom: 8,
  },
})