import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { CurrentUser } from '../lib/types'

export function useCurrentUser() {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  return useQuery({
    queryKey: ['current-user'],
    enabled: isLoaded && !!isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<CurrentUser>('/users/me', token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
