import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { LessonSet } from '../lib/types'

export function useLessonSets() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['lesson-sets'],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<LessonSet[]>('/lesson-sets', token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
