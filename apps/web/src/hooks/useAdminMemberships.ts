import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { AdminMembershipPage } from '../lib/types'

interface UseAdminMembershipsParams {
  page?: number
  pageSize?: number
  status?: string
}

export function useAdminMemberships(params: UseAdminMembershipsParams = {}) {
  const { getToken } = useAuth()
  const { page = 1, pageSize = 20, status } = params

  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('pageSize', String(pageSize))
  if (status) queryParams.set('status', status)

  return useQuery({
    queryKey: ['admin-memberships', { page, pageSize, status }],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<AdminMembershipPage>(`/admin/memberships?${queryParams.toString()}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
