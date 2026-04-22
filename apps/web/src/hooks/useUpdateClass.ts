import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { Class } from '../lib/types'

interface UpdateClassInput {
  description?: string
  location?: string
}

export function useUpdateClass(classId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateClassInput) => {
      const token = await getToken()
      return apiFetch<Class>(`/classes/${classId}`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['class', classId] })
      void queryClient.invalidateQueries({ queryKey: ['instructor-classes'] })
    },
  })
}
