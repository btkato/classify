import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'
import type { LessonSetWithClasses } from '../lib/types'

export function useLessonSet(lessonSetId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['lesson-set', lessonSetId],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<LessonSetWithClasses>(`/lesson-sets/${lessonSetId}`, token)
    },
    enabled: !!lessonSetId,
    staleTime: 1000 * 60,
  })
}
