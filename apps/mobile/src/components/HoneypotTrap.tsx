import React from 'react'
import { TextInput, StyleSheet, View } from 'react-native'

interface Props {
  onValue?: (value: string) => void
}

export default function HoneypotTrap({ onValue }: Props) {
  return (
    <View style={styles.hidden} pointerEvents="none">
      <TextInput
        style={styles.hidden}
        autoComplete="off"
        autoCorrect={false}
        importantForAutofill="no"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onChangeText={onValue}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
})