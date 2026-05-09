import { useAuth } from '@clerk/clerk-expo'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export function useCancelLessonSetRegistration() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonSetId }: { lessonSetId: string }) => {
      const token = await getToken()
      return apiFetch<object>(`/registrations/lesson-set/${lessonSetId}`, token, {
        method: 'DELETE',
      })
    },
    onSuccess: (_data, { lessonSetId }) => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['lesson-set', lessonSetId] })
    },
  })
}
