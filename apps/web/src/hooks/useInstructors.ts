import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { AdminUser, UserPage } from '../lib/types'

export function useInstructors(search?: string) {
  const { getToken } = useAuth()

  const queryParams = new URLSearchParams()
  queryParams.set('role', 'INSTRUCTOR')
  queryParams.set('pageSize', '100')
  if (search) queryParams.set('search', search)

  return useQuery({
    queryKey: ['instructors', { search }],
    queryFn: async (): Promise<AdminUser[]> => {
      const token = await getToken()
      const result = await apiFetch<UserPage>(`/admin/users?${queryParams.toString()}`, token ?? undefined)
      return result.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
