import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { NotificationTrigger } from '../lib/types'

interface CreateTriggerInput {
  name: string
  triggerEvent: string
  offsetDays: number
  threshold: number | null
  messageTemplate: string
  isActive?: boolean
}

export function useCreateNotificationTrigger() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTriggerInput) => {
      const token = await getToken()
      return apiFetch<NotificationTrigger>('/notification-triggers', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-triggers'] })
    },
  })
}
