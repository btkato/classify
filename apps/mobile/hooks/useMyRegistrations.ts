import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'
import type { RegistrationWithClass } from '../lib/types'

export function useMyRegistrations() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RegistrationWithClass[]>('/registrations', token)
    },
    enabled: !!isSignedIn,
    staleTime: 1000 * 60,
  })
}
