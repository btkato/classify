import { useAuth } from '@clerk/clerk-expo'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export function useEnrollInLessonSet(lessonSetId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return apiFetch<object>('/registrations/lesson-set', token, {
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
