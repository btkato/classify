export interface ClassSummary {
  id: string
  title: string
  startsAt: string
  durationMinutes: number
  location: string | null
  status: string
}

export interface RegistrationWithClass {
  id: string
  classId: string
  userId: string
  membershipId: string | null
  status: string
  waitlistPosition: number | null
  createdAt: string
  updatedAt: string
  class: ClassSummary
}

export interface Membership {
  id: string
  type: string
  status: string
  expiresAt: string | null
  classesRemaining: number | null
  classesTotal: number | null
  priority: number
  createdAt: string
  updatedAt: string
}

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
