import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useReplyToThread(threadId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: string) => {
      const token = await getToken()
      return apiFetch(`/messages/${threadId}/reply`, token ?? undefined, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}
