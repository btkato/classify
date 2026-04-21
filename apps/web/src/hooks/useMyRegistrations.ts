import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { RegistrationWithClass } from '../lib/types'

export function useMyRegistrations() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RegistrationWithClass[]>('/registrations', token ?? undefined)
    },
  })
}
