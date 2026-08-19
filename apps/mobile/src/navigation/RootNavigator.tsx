import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import MainTabs from './MainTabs'
import PhoneLoginScreen from '../screens/PhoneLoginScreen'
import OtpVerifyScreen from '../screens/OtpVerifyScreen'
import TenantServicesScreen from '../screens/TenantServicesScreen'
import BookingFlowScreen from '../screens/BookingFlowScreen'
import BookingConfirmationScreen from '../screens/BookingConfirmationScreen'
import BookingDetailScreen from '../screens/BookingDetailScreen'
import BookingLookupScreen from '../screens/BookingLookupScreen'
import AiChatScreen from '../screens/AiChatScreen'
import type { RootStackParamList } from './types'
import { colors } from '../theme'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} options={{ title: 'Log in' }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: 'Verify code' }} />
      <Stack.Screen name="TenantServices" component={TenantServicesScreen} options={{ title: 'Services' }} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Book' }} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ title: 'Confirmed', headerBackVisible: false }} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking' }} />
      <Stack.Screen name="BookingLookup" component={BookingLookupScreen} options={{ title: 'Find booking' }} />
      <Stack.Screen name="AiChat" component={AiChatScreen} options={{ title: 'Assistant' }} />
    </Stack.Navigator>
  )
}