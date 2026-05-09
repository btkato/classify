import { useAuth } from '@clerk/clerk-expo'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/apiFetch'
import type { Class } from '../lib/types'

export function useClass(classId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<Class>(`/classes/${classId}`, token)
    },
    enabled: !!classId,
    staleTime: 1000 * 60,
  })
}
