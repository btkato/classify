import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

interface CancelLessonSetRegistrationInput {
  lessonSetId: string
}

export function useCancelLessonSetRegistration() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lessonSetId }: CancelLessonSetRegistrationInput) => {
      const token = await getToken()
      return apiFetch<void>(`/registrations/lesson-set/${lessonSetId}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: (_data, { lessonSetId }) => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['lesson-set', lessonSetId] })
    },
  })
}
