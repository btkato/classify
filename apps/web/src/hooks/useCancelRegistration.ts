import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

interface CancelRegistrationInput {
  registrationId: string
  classId: string
}

export function useCancelRegistration() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ registrationId }: CancelRegistrationInput) => {
      const token = await getToken()
      return apiFetch<void>(`/registrations/${registrationId}`, token ?? undefined, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}
