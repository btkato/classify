import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { LessonSetWithClasses } from '../lib/types'

export function useLessonSet(id: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['lesson-set', id],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<LessonSetWithClasses>(`/lesson-sets/${id}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
    enabled: !!id,
  })
}
