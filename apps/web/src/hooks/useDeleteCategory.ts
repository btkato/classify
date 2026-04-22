import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

export function useDeleteCategory() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return apiFetch<void>(`/class-categories/${id}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['class-categories'] })
    },
  })
}
