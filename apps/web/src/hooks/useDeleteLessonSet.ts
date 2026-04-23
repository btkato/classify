import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useDeleteLessonSet() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lessonSetId: string) => {
      const token = await getToken()
      return apiFetch<void>(`/lesson-sets/${lessonSetId}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-sets'] })
    },
  })
}
