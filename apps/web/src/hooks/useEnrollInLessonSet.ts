import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useEnrollInLessonSet(lessonSetId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return apiFetch<object>('/registrations/lesson-set', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify({ lessonSetId }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['lesson-set', lessonSetId] })
    },
  })
}
