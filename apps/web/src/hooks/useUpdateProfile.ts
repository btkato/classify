import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { CurrentUser } from '../lib/types'

interface UpdateProfileInput {
  userId: string
  phone: string
  dateOfBirth: string
}

export function useUpdateProfile() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, phone, dateOfBirth }: UpdateProfileInput) => {
      const token = await getToken()
      return apiFetch<CurrentUser>(`/users/${userId}`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify({ phone, dateOfBirth }),
      })
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['current-user'], updatedUser)
    },
  })
}
