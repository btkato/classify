import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'
import type { ClassPage } from '../lib/types'

interface UseClassesOptions {
  page?: number
  search?: string
  categoryId?: string
}

export function useClasses(options: UseClassesOptions = {}) {
  const { getToken } = useAuth()
  const { page = 1, search, categoryId } = options

  return useQuery({
    queryKey: ['classes', { page, search, categoryId }],
    queryFn: async () => {
      const token = await getToken()
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      return apiFetch<ClassPage>(`/classes?${params.toString()}`, token)
    },
    staleTime: 1000 * 60,
  })
}
