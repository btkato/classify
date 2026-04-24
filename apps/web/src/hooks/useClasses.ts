import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { ClassPage } from '../lib/types'

interface UseClassesOptions {
  categoryId?: string
  page?: number
  search?: string
}

export function useClasses({ categoryId, page = 1, search }: UseClassesOptions = {}) {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  params.set('page', String(page))
  if (search) params.set('search', search)

  return useQuery({
    queryKey: ['classes', { categoryId, page, search }],
    queryFn: () => apiFetch<ClassPage>(`/classes?${params.toString()}`),
    staleTime: 1000 * 60,
  })
}
