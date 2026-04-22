import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useCurrentUser } from './useCurrentUser'
import type { ClassPage } from '../lib/types'

interface UseInstructorClassesOptions {
  page?: number
  from?: string
  to?: string
}

export function useInstructorClasses({ page = 1, from, to }: UseInstructorClassesOptions = {}) {
  const { data: currentUser, isLoading } = useCurrentUser()

  const params = new URLSearchParams()
  if (currentUser?.id) params.set('instructorId', currentUser.id)
  params.set('page', String(page))
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  return useQuery({
    queryKey: ['instructor-classes', { instructorId: currentUser?.id, page, from, to }],
    enabled: !isLoading && !!currentUser?.id,
    queryFn: () => apiFetch<ClassPage>(`/classes?${params.toString()}`),
    staleTime: 1000 * 60,
  })
}
