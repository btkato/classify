import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { NotificationTrigger } from '../lib/types'

export function useNotificationTriggers() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['notification-triggers'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<NotificationTrigger[]>('/notification-triggers', token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
