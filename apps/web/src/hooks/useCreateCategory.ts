import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { ClassCategory } from '../lib/types'

export function useCreateCategory() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const token = await getToken()
      return apiFetch<ClassCategory>('/class-categories', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['class-categories'] })
    },
  })
}
