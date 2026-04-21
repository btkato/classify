import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { Class } from '../lib/types'

export function useClass(id: string) {
  return useQuery({
    queryKey: ['classes', id],
    queryFn: () => apiFetch<Class>(`/classes/${id}`),
  })
}
