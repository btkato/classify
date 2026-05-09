import { useAuth } from '@clerk/clerk-expo'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'

export function useEnroll(classId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      return apiFetch('/registrations', token, {
        method: 'POST',
        body: JSON.stringify({ classId }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['class', classId] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

export function useCancelRegistration() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ registrationId, classId }: { registrationId: string; classId: string }) => {
      const token = await getToken()
      return apiFetch(`/registrations/${registrationId}`, token, {
        method: 'DELETE',
      })
    },
    onSuccess: (_data, { classId }) => {
      void queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
      void queryClient.invalidateQueries({ queryKey: ['class', classId] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}
