import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme'

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.loader} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.border,
    borderTopColor: colors.accent,
  },
  label: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 13,
  },
})