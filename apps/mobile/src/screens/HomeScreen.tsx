import React from 'react'
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { listTenants } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import type { Tenant } from '../types'
import { colors } from '../theme'
import { Spinner } from '../components/Spinner'
import { Card } from '../components/Card'

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>

export default function HomeScreen({ navigation }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenants'],
    queryFn: listTenants,
  })

  const tenants: Tenant[] = data || []

  const renderTenant = ({ item }: { item: Tenant }) => (
    <Pressable
      onPress={() => navigation.navigate('TenantServices', { tenant: item })}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={[styles.avatar, item.primaryColor ? { backgroundColor: item.primaryColor } : null]}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        <Text style={styles.itemSub}>@{item.slug}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>BookerMap</Text>
        <Text style={styles.tagline}>Book home services near you</Text>
      </View>

      {isLoading ? (
        <Spinner label="Loading businesses..." />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Could not load businesses. Check that the API is running.</Text>
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          renderItem={renderTenant}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No businesses available yet</Text>}
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
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.accent,
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  itemPressed: {
    backgroundColor: colors.mutedBackground,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
})