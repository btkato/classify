import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'

interface UpdateUserRolesInput {
  role: string
  action: 'grant' | 'revoke'
}

export function useUpdateUserRoles(userId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateUserRolesInput) => {
      const token = await getToken()
      return apiFetch<{ success: boolean }>(`/admin/users/${userId}/roles`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-user', userId] })
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}
