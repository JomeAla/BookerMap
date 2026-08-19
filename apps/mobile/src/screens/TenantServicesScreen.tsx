import React from 'react'
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { getServices } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import type { Service } from '../types'
import { formatCurrency } from '../lib/format'
import { colors } from '../theme'
import { Spinner } from '../components/Spinner'

type Props = NativeStackScreenProps<RootStackParamList, 'TenantServices'>

export default function TenantServicesScreen({ navigation, route }: Props) {
  const { tenant } = route.params
  const { data, isLoading, isError } = useQuery({
    queryKey: ['services', tenant.slug],
    queryFn: () => getServices(tenant.slug),
  })

  const services: Service[] = data || []

  const renderService = ({ item }: { item: Service }) => (
    <Pressable
      onPress={() => navigation.navigate('BookingFlow', { tenant, service: item })}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardBody}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDesc} numberOfLines={2}>{item.description || 'No description'}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{item.duration} min</Text>
          <Text style={styles.price}>{formatCurrency(item.price, tenant.currency)}</Text>
        </View>
      </View>
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>{tenant.name}</Text>
          <Pressable onPress={() => navigation.navigate('AiChat', { tenantSlug: tenant.slug })}>
            <Text style={styles.chatLink}>Assistant</Text>
          </Pressable>
        </View>
        <Text style={styles.tagline}>Choose a service</Text>
      </View>

      {isLoading ? (
        <Spinner label="Loading services..." />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Could not load services.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={renderService}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No services available yet</Text>}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLink: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
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
  },
  list: {
    padding: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  cardPressed: {
    backgroundColor: colors.mutedBackground,
  },
  cardBody: {},
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: colors.danger,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
})