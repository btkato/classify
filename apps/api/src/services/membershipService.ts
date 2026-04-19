import { prisma } from '../lib/prisma.js'
import { NotFoundError, ForbiddenError } from '../lib/errors.js'
import type { Membership, MembershipType, Prisma } from 'db'

type MembershipWithTransactions = Prisma.MembershipGetPayload<{
  include: { membershipTransactions: true }
}>

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const YEAR_DAYS_MS = 365 * 24 * 60 * 60 * 1000

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
  }
}

export async function createMembership(userId: string, type: MembershipType): Promise<Membership> {
  const derived = deriveMembershipFields(type)
  return prisma.membership.create({
    data: {
      userId,
      type,
      status: 'ACTIVE',
      ...derived,
    },
  })
}

export async function listMemberships(userId: string): Promise<Membership[]> {
  return prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
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

export async function getValidMembership(userId: string): Promise<Membership | null> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ priority: 'asc' }, { expiresAt: { sort: 'asc', nulls: 'last' } }],
  })

  return memberships.find((m) => m.classesRemaining === null || m.classesRemaining > 0) ?? null
}
