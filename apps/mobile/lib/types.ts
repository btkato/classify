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
  sessionNumber: number | null
}

export interface ClassPage {
  data: Class[]
  total: number
  page: number
  totalPages: number
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
  class: {
    id: string
    title: string
    startsAt: string
    durationMinutes: number
    location: string | null
    status: string
  }
}
