import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { Slot, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 } },
})

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key)
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value)
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key)
  },
}

const publishableKey = process.env['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY']
if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY')
}

function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    const inApp = segments[0] === '(app)'
    if (!isSignedIn && inApp) {
      router.replace('/sign-in')
    } else if (isSignedIn && !inApp) {
      router.replace('/(app)/classes')
    }
  }, [isLoaded, isSignedIn, segments, router])

  return <Slot />
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </ClerkProvider>
  )
}
