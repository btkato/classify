import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { ClassPage } from '../lib/types'

export function useClasses(categoryId?: string, page = 1) {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  params.set('page', String(page))
  const query = `?${params.toString()}`

  return useQuery({
    queryKey: ['classes', { categoryId, page }],
    queryFn: () => apiFetch<ClassPage>(`/classes${query}`),
    staleTime: 1000 * 60,
  })
}
