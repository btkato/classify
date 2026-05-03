import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { NotificationTrigger } from '../lib/types'

interface UpdateTriggerInput {
  id: string
  name?: string
  triggerEvent?: string
  offsetDays?: number
  threshold?: number | null
  messageTemplate?: string
  isActive?: boolean
}

export function useUpdateNotificationTrigger() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTriggerInput) => {
      const token = await getToken()
      return apiFetch<NotificationTrigger>(`/notification-triggers/${id}`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-triggers'] })
    },
  })
}
