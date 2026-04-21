export interface ClassCategory {
  id: string
  name: string
}

export interface Class {
  id: string
  title: string
  description: string | null
  categoryId: string
  instructorId: string
  capacity: number
  enrolledCount: number
  startsAt: string
  durationMinutes: number
  location: string | null
  status: string
  classNumber: number
}
