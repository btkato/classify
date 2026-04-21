import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { Membership } from '../lib/types'

export function useMemberships() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<Membership[]>('/memberships', token ?? undefined)
    },
  })
}
