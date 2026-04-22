import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export interface RosterEntry {
  id: string
  status: string
  waitlistPosition: number | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export function useRoster(classId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['roster', classId],
    enabled: !!classId,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<RosterEntry[]>(`/classes/${classId}/roster`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
