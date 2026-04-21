import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { MembershipHistoryPage } from '../lib/types'

export function useMembershipHistory(page: number = 1, limit: number = 5) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['memberships', 'history', { page, limit }],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<MembershipHistoryPage>(
        `/memberships/history?page=${page}&limit=${limit}`,
        token ?? undefined
      )
    },
  })
}
