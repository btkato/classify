import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { apiFetch } from '../lib/apiFetch'

export function useRegisterPushToken() {
  const { userId, getToken } = useAuth()

  useEffect(() => {
    if (!userId) return

    async function register() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        })
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (finalStatus !== 'granted') return

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync()
        const authToken = await getToken()
        await apiFetch(`/users/${userId}`, authToken, {
          method: 'PATCH',
          body: JSON.stringify({ pushToken: tokenData.data }),
        })
      } catch {
        // Simulator or EAS not configured — skip silently
      }
    }

    void register()
  }, [userId, getToken])
}
