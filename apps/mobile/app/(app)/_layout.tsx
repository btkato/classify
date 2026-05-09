import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useRegisterPushToken } from '../../hooks/useRegisterPushToken'

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  useRegisterPushToken()

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="classes/index" options={{ title: 'Classes' }} />
      <Stack.Screen name="classes/[id]" options={{ title: 'Class Detail' }} />
      <Stack.Screen name="lesson-sets/[id]" options={{ title: 'Series Detail' }} />
    </Stack>
  )
}
