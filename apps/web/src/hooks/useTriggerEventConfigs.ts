import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { TriggerEventConfig } from '../lib/types'

export function useTriggerEventConfigs() {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: ['trigger-event-configs'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<TriggerEventConfig[]>('/notification-triggers/events', token ?? undefined)
    },
    staleTime: 1000 * 60 * 60,
  })
}
