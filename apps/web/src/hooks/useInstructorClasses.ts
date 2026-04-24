import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import { useCurrentUser } from './useCurrentUser'
import type { ClassPage } from '../lib/types'

interface UseInstructorClassesOptions {
  page?: number
  from?: string
  to?: string
  status?: string
  search?: string
}

export function useInstructorClasses({ page = 1, from, to, status, search }: UseInstructorClassesOptions = {}) {
  const { getToken } = useAuth()
  const { data: currentUser, isLoading } = useCurrentUser()

  const params = new URLSearchParams()
  if (currentUser?.id) params.set('instructorId', currentUser.id)
  params.set('page', String(page))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (status) params.set('status', status)
  if (search) params.set('search', search)

  return useQuery({
    queryKey: ['instructor-classes', { instructorId: currentUser?.id, page, from, to, status, search }],
    enabled: !isLoading && !!currentUser?.id,
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ClassPage>(`/classes?${params.toString()}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
