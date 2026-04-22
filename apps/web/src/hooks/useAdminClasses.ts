import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { ClassPage } from '../lib/types'

interface UseAdminClassesParams {
  status?: string
  categoryId?: string
  page?: number
  pageSize?: number
}

export function useAdminClasses(params: UseAdminClassesParams = {}) {
  const { getToken } = useAuth()
  const { status, categoryId, page = 1, pageSize = 20 } = params

  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('pageSize', String(pageSize))
  if (status) queryParams.set('status', status)
  if (categoryId) queryParams.set('categoryId', categoryId)

  return useQuery({
    queryKey: ['admin-classes', { status, categoryId, page, pageSize }],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<ClassPage>(`/classes?${queryParams.toString()}`, token ?? undefined)
    },
    staleTime: 1000 * 60,
  })
}
