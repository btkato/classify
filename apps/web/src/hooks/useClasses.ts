import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Class } from '../lib/types'

export function useClasses(categoryId?: string) {
  const params = new URLSearchParams()
  if (categoryId) params.set('categoryId', categoryId)
  const query = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['classes', { categoryId }],
    queryFn: () => apiFetch<Class[]>(`/classes${query}`),
  })
}
