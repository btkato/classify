import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useCreateDirectMessage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { instructorId: string; body: string }) => {
      const token = await getToken()
      return apiFetch('/messages', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}
