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
  sessionNumber: number | null
}

export interface LessonSet {
  id: string
  title: string
  description: string | null
  enrollmentType: string
  totalSessions: number
  instructorId: string
  categoryId: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface LessonSetWithClasses extends LessonSet {
  classes: Class[]
}

export interface MessageParticipant {
  userId: string
  canReply: boolean
  user: { firstName: string; lastName: string }
}

export interface InboxMessage {
  id: string
  body: string
  sentAt: string
  senderId: string
  readAt: string | null
}

export interface ThreadSummary {
  threadId: string
  type: 'DIRECT' | 'ANNOUNCEMENT'
  classId: string | null
  className: string | null
  participants: MessageParticipant[]
  latestMessage: InboxMessage | null
}

export interface ThreadMessage {
  id: string
  threadId: string
  senderId: string
  body: string
  triggerId: string | null
  readAt: string | null
  sentAt: string
}

export interface MembershipPlan {
  id: string
  type: string
  displayName: string
  description: string
  priceInCents: number
  stripePriceId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ThreadDetail {
  threadId: string
  type: 'DIRECT' | 'ANNOUNCEMENT'
  classId: string | null
  className: string | null
  participants: MessageParticipant[]
  messages: ThreadMessage[]
}
