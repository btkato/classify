import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { AdminMembership } from '../lib/types'

interface UpdateMembershipInput {
  classesRemaining?: number
  status?: 'PAUSED' | 'CANCELLED'
}

export function useUpdateMembership(membershipId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateMembershipInput) => {
      const token = await getToken()
      return apiFetch<AdminMembership>(`/admin/memberships/${membershipId}`, token ?? undefined, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-memberships'] })
    },
  })
}
