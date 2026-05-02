import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { NotificationJobPage } from '../lib/types'

interface UseNotificationJobsParams {
  page?: number
  pageSize?: number
  status?: string
  triggerId?: string
}

export function useNotificationJobs(params: UseNotificationJobsParams = {}) {
  const { getToken } = useAuth()
  const { page = 1, pageSize = 20, status, triggerId } = params

  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('pageSize', String(pageSize))
  if (status) queryParams.set('status', status)
  if (triggerId) queryParams.set('triggerId', triggerId)

  return useQuery({
    queryKey: ['notification-jobs', { page, pageSize, status, triggerId }],
    queryFn: async () => {
      const token = await getToken()
      return apiFetch<NotificationJobPage>(
        `/admin/notification-jobs?${queryParams.toString()}`,
        token ?? undefined
      )
    },
    staleTime: 1000 * 60,
  })
}
