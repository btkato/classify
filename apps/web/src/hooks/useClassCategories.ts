import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { ClassCategory } from '../lib/types'

export function useClassCategories() {
  return useQuery({
    queryKey: ['class-categories'],
    queryFn: () => apiFetch<ClassCategory[]>('/class-categories'),
  })
}
