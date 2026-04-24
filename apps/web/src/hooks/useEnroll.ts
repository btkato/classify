import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { RegistrationWithClass } from '../lib/types'

export function useEnroll(classId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return apiFetch<RegistrationWithClass>('/registrations', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify({ classId }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}
