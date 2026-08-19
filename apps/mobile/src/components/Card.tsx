import React from 'react'
import { StyleSheet, Text, View, ViewStyle, StyleProp, ViewProps } from 'react-native'
import { colors } from '../theme'

export function Card({ children, style, ...rest }: { children?: React.ReactNode; style?: StyleProp<ViewStyle> } & ViewProps) {
  return <View style={[styles.card, style]} {...rest}>{children}</View>
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>
}

export function MutedText({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[styles.muted, style as any]}>{children}</Text>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
})