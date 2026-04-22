import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { LessonSet } from '../lib/types'

interface UpdateLessonSetInput {
  title?: string
  description?: string
  status?: string
}

export function useUpdateLessonSet(lessonSetId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateLessonSetInput) => {
      const token = await getToken()
      return apiFetch<LessonSet>(`/lesson-sets/${lessonSetId}`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-set', lessonSetId] })
      void queryClient.invalidateQueries({ queryKey: ['lesson-sets'] })
    },
  })
}
