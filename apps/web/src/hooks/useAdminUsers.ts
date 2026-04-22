import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { UserPage } from '../lib/types'

interface UseAdminUsersParams {
  page?: number
  pageSize?: number
  search?: string
}

export function useAdminUsers(params: UseAdminUsersParams = {}) {
  const { getToken } = useAuth()
  const { page = 1, pageSize = 20, search } = params

  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('pageSize', String(pageSize))
  if (search) queryParams.set('search', search)

  return useQuery({
    queryKey: ['admin-users', { page, pageSize, search }],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<UserPage>(`/admin/users?${queryParams.toString()}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
