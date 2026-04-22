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
  userId: string
  type: string
  status: string
  expiresAt: string | null
  classesRemaining: number | null
  classesTotal: number | null
  priority: number
  createdAt: string
  updatedAt: string
}

export interface MembershipPage {
  data: Membership[]
  total: number
  page: number
  totalPages: number
}

export interface AdminMembership extends Membership {
  user: { email: string; firstName: string; lastName: string }
}

export interface AdminMembershipPage {
  data: AdminMembership[]
  total: number
  page: number
  totalPages: number
}

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  createdAt: string
  roles: { role: string }[]
}

export interface UserPage {
  data: AdminUser[]
  total: number
  page: number
  totalPages: number
}

export interface MembershipHistoryPage {
  data: Membership[]
  total: number
  page: number
  totalPages: number
}

export interface CurrentUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: { role: string }[]
}

export interface ClassPage {
  data: Class[]
  total: number
  page: number
  totalPages: number
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
