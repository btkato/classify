import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { AdminUser } from '../lib/types'

export function useAdminUser(id: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<AdminUser>(`/users/${id}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
    enabled: !!id,
  })
}
