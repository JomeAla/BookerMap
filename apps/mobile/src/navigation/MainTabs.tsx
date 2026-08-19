import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import HomeScreen from '../screens/HomeScreen'
import MyBookingsScreen from '../screens/MyBookingsScreen'
import BookingLookupScreen from '../screens/BookingLookupScreen'
import type { MainTabsParamList } from './types'
import { colors } from '../theme'

const Tab = createBottomTabNavigator<MainTabsParamList>()

const tabIcons: Record<keyof MainTabsParamList, string> = {
  Home: '🏠',
  MyBookings: '📅',
  Lookup: '🔎',
}

function TabIcon({ name, color }: { name: keyof MainTabsParamList; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{tabIcons[name]}</Text>
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color }) => <TabIcon name={route.name as keyof MainTabsParamList} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen as any} />
      <Tab.Screen name="MyBookings" component={MyBookingsScreen as any} />
      <Tab.Screen name="Lookup" component={BookingLookupScreen as any} />
    </Tab.Navigator>
  )
}