import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { RegistrationWithClass } from '../lib/types'

export function useMyRegistrations() {
  const { isSignedIn, getToken } = useAuth()

  return useQuery({
    queryKey: ['my-registrations'],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RegistrationWithClass[]>('/registrations', token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
