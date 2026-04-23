import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useDeleteClass(lessonSetId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (classId: string) => {
      const token = await getToken()
      return apiFetch<void>(`/classes/${classId}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-set', lessonSetId] })
      void queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
    },
  })
}
