import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { ThreadSummary } from '../lib/types'

export function useInbox() {
  const { getToken, isSignedIn } = useAuth()

  return useQuery({
    queryKey: ['inbox'],
    enabled: !!isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ThreadSummary[]>('/messages', token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
