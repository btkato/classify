import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { ThreadDetail } from '../lib/types'

export function useThread(threadId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['thread', threadId],
    enabled: !!threadId,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ThreadDetail>(`/messages/${threadId}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
