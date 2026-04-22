import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { Class } from '../lib/types'

interface CreateClassInput {
  title: string
  categoryId: string
  description?: string
  startsAt: string
  durationMinutes: number
  capacity: number
  location?: string
  instructorId?: string
}

export function useCreateClass() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateClassInput) => {
      const token = await getToken()
      return apiFetch<Class>('/classes', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-classes'] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}
