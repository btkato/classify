import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import type { LessonSet } from '../lib/types'

interface CreateLessonSetInput {
  title: string
  description?: string
  enrollmentType: string
  totalSessions: number
  categoryId: string
  capacity: number
  durationMinutes: number
  firstSessionStartsAt: string
  intervalDays: number
  location?: string
  instructorId?: string
  status: string
}

export function useCreateLessonSet() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLessonSetInput) => {
      const token = await getToken()
      return apiFetch<LessonSet>('/lesson-sets', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson-sets'] })
    },
  })
}
