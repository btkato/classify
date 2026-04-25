import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { MembershipPlan } from '../lib/types'

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: () => apiFetch<MembershipPlan[]>('/membership-plans'),
    staleTime: 1000 * 60,
  })
}
