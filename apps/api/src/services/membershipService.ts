import { prisma } from '../lib/prisma.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js'
import type { Membership, MembershipStatus, MembershipType, Prisma, TriggerEvent } from 'db'

type MembershipWithTransactions = Prisma.MembershipGetPayload<{
  include: { membershipTransactions: true }
}>

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const YEAR_DAYS_MS = 365 * 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const PURCHASE_TRIGGER_EVENTS: TriggerEvent[] = [
  'AFTER_PURCHASE',
  'MEMBERSHIP_EXPIRING',
  'MEMBERSHIP_EXPIRED',
]

interface DerivedFields {
  priority: number
  classesTotal: number | null
  classesRemaining: number | null
  expiresAt: Date | null
}

function deriveMembershipFields(type: MembershipType): DerivedFields {
  switch (type) {
    case 'MONTHLY':
    case 'CONTINUOUS_MONTHLY':
      return { priority: 1, classesTotal: null, classesRemaining: null, expiresAt: new Date(Date.now() + THIRTY_DAYS_MS) }
    case 'YEARLY':
      return { priority: 1, classesTotal: null, classesRemaining: null, expiresAt: new Date(Date.now() + YEAR_DAYS_MS) }
    case 'DROP_IN':
      return { priority: 2, classesTotal: 1, classesRemaining: 1, expiresAt: null }
    case 'CLASS_PACK_5':
      return { priority: 2, classesTotal: 5, classesRemaining: 5, expiresAt: null }
    case 'CLASS_PACK_10':
      return { priority: 2, classesTotal: 10, classesRemaining: 10, expiresAt: null }
    default: {
      const _exhaustive: never = type
      throw new Error(`Unhandled MembershipType: ${_exhaustive}`)
    }
  }
}

export async function createMembership(userId: string, type: MembershipType): Promise<Membership> {
  const derived = deriveMembershipFields(type)

  return prisma.$transaction(async (transaction) => {
    const membership = await transaction.membership.create({
      data: { userId, type, status: 'ACTIVE', ...derived },
    })

    const triggers = await transaction.notificationTrigger.findMany({
      where: { isActive: true, triggerEvent: { in: PURCHASE_TRIGGER_EVENTS } },
    })

    const now = Date.now()
    const jobs = triggers.flatMap((trigger) => {
      if (trigger.triggerEvent === 'AFTER_PURCHASE') {
        return [{ userId, membershipId: membership.id, triggerId: trigger.id, triggerAt: new Date(now + trigger.offsetDays * DAY_MS) }]
      }
      if (!membership.expiresAt) return []
      const expiresMs = membership.expiresAt.getTime()
      if (trigger.triggerEvent === 'MEMBERSHIP_EXPIRING') {
        return [{ userId, membershipId: membership.id, triggerId: trigger.id, triggerAt: new Date(expiresMs - trigger.offsetDays * DAY_MS) }]
      }
      return [{ userId, membershipId: membership.id, triggerId: trigger.id, triggerAt: new Date(expiresMs + trigger.offsetDays * DAY_MS) }]
    })

    if (jobs.length > 0) {
      await transaction.notificationJob.createMany({ data: jobs })
    }

    return membership
  })
}

export async function listMemberships(userId: string): Promise<Membership[]> {
  return prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

interface MembershipHistoryPage {
  data: Membership[]
  total: number
  page: number
  totalPages: number
}

export async function listMembershipHistory(
  userId: string,
  page: number = 1,
  limit: number = 5
): Promise<MembershipHistoryPage> {
  const [data, total] = await Promise.all([
    prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.membership.count({ where: { userId } }),
  ])

  return { data, total, page, totalPages: Math.ceil(total / limit) }
}

export async function getMembership(
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<MembershipWithTransactions> {
  const membership = await prisma.membership.findUnique({
    where: { id },
    include: { membershipTransactions: true },
  })

  if (!membership) {
    throw new NotFoundError('Membership not found')
  }

  if (membership.userId !== userId && !isAdmin) {
    throw new ForbiddenError('You do not have permission to view this membership')
  }

  return membership
}

interface UpdateMembershipInput {
  classesRemaining?: number
  status?: Extract<MembershipStatus, 'PAUSED' | 'CANCELLED'>
}

export async function updateMembership(id: string, input: UpdateMembershipInput): Promise<Membership> {
  return prisma.$transaction(async (transaction) => {
    const membership = await transaction.membership.findUnique({ where: { id } })

    if (!membership) {
      throw new NotFoundError('Membership not found')
    }

    if (input.classesRemaining !== undefined) {
      if (membership.classesTotal === null) {
        throw new ValidationError('Cannot adjust classesRemaining on a time-based membership')
      }

      const delta = input.classesRemaining - (membership.classesRemaining ?? 0)
      if (delta !== 0) {
        await transaction.membershipTransaction.create({
          data: {
            membershipId: id,
            delta,
            balanceAfter: input.classesRemaining,
            note: 'Admin adjustment',
          },
        })
      }
    }

    return transaction.membership.update({
      where: { id },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.classesRemaining !== undefined && { classesRemaining: input.classesRemaining }),
      },
    })
  })
}

type PrismaOrTransaction = typeof prisma | Prisma.TransactionClient

export async function cancelMembership(id: string, userId: string): Promise<Membership> {
  const membership = await prisma.membership.findUnique({ where: { id } })

  if (!membership) {
    throw new NotFoundError('Membership not found')
  }

  if (membership.userId !== userId) {
    throw new ForbiddenError('You do not have permission to cancel this membership')
  }

  if (membership.type !== 'CONTINUOUS_MONTHLY') {
    throw new ValidationError('Only CONTINUOUS_MONTHLY memberships can be self-cancelled')
  }

  if (membership.status !== 'ACTIVE') {
    throw new ValidationError('Only ACTIVE memberships can be cancelled')
  }

  return prisma.membership.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
}

interface ListAllMembershipsInput {
  page: number
  pageSize: number
}

export interface MembershipPage {
  data: Membership[]
  total: number
  page: number
  totalPages: number
}

export async function listAllMemberships(input: ListAllMembershipsInput): Promise<MembershipPage> {
  const skip = (input.page - 1) * input.pageSize

  const [data, total] = await Promise.all([
    prisma.membership.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.membership.count(),
  ])

  return { data, total, page: input.page, totalPages: Math.ceil(total / input.pageSize) }
}

export async function getValidMembership(
  userId: string,
  db: PrismaOrTransaction = prisma
): Promise<Membership | null> {
  const memberships = await db.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ priority: 'asc' }, { expiresAt: { sort: 'asc', nulls: 'last' } }],
  })

  return memberships.find((m) => m.classesRemaining === null || m.classesRemaining > 0) ?? null
}
