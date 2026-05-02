import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useDeleteNotificationTrigger() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return apiFetch<void>(`/notification-triggers/${id}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-triggers'] })
    },
  })
}
