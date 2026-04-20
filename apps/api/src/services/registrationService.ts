import { prisma } from '../lib/prisma.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js'
import type { Registration, Prisma } from 'db'

async function getValidMembershipTransaction(
  userId: string, 
  transaction: Prisma.TransactionClient
): Promise<Prisma.MembershipGetPayload<object> | null> {
  const memberships = await transaction.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ priority: 'asc' }, { expiresAt: { sort: 'asc', nulls: 'last' } }],
  })
  return memberships.find((membership) => membership.classesRemaining === null || membership.classesRemaining > 0) ?? null
}

export async function enrollStudent(userId: string, classId: string): Promise<Registration> {
  return prisma.$transaction(async (transaction) => {
    const foundClass = await transaction.class.findUnique({ where: { id: classId } })
    if (!foundClass) throw new NotFoundError('Class not found')
    if (foundClass.status !== 'ACTIVE') throw new ValidationError('Class is not available for enrollment')

    const enrolledCount = await transaction.registration.count({
      where: { classId, status: 'ENROLLED' },
    })

    if (enrolledCount >= foundClass.capacity) {
      const lastWaitlisted = await transaction.registration.findFirst({
        where: { classId, status: 'WAITLISTED' },
        orderBy: { waitlistPosition: 'desc' },
      })
      const waitlistPosition = (lastWaitlisted?.waitlistPosition ?? 0) + 1
      return transaction.registration.create({
        data: { userId, classId, status: 'WAITLISTED', waitlistPosition },
      })
    }

    const membership = await getValidMembershipTransaction(userId, transaction)
    if (!membership) throw new ValidationError('No valid membership found. Please purchase a membership to enroll.')

    const registration = await transaction.registration.create({
      data: { userId, classId, status: 'ENROLLED', membershipId: membership.id },
    })

    if (membership.classesRemaining !== null) {
      const newBalance = membership.classesRemaining - 1
      await transaction.membership.update({
        where: { id: membership.id },
        data: { classesRemaining: newBalance },
      })
      await transaction.membershipTransaction.create({
        data: {
          membershipId: membership.id,
          registrationId: registration.id,
          delta: -1,
          balanceAfter: newBalance,
        },
      })
    }

    return registration
  })
}

export async function cancelRegistration(registrationId: string, userId: string): Promise<Registration> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
  })

  if (!registration) throw new NotFoundError('Registration not found')
  if (registration.userId !== userId) throw new ForbiddenError('You do not have permission to cancel this registration')
  if (registration.status === 'CANCELLED') throw new ValidationError('Registration is already cancelled')
  if (registration.status === 'ATTENDED' || registration.status === 'ABSENT') {
    throw new ValidationError('Cannot cancel a completed registration')
  }

  return prisma.$transaction(async (transaction) => {
    const cancelled = await transaction.registration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED' },
    })

    if (registration.status === 'WAITLISTED') {
      await transaction.registration.updateMany({
        where: {
          classId: registration.classId,
          status: 'WAITLISTED',
          waitlistPosition: { gt: registration.waitlistPosition ?? 0 },
        },
        data: { waitlistPosition: { decrement: 1 } },
      })
      return cancelled
    }

    const firstWaitlisted = await transaction.registration.findFirst({
      where: { classId: registration.classId, status: 'WAITLISTED' },
      orderBy: { waitlistPosition: 'asc' },
    })

    if (firstWaitlisted) {
      await transaction.registration.update({
        where: { id: firstWaitlisted.id },
        data: { status: 'ENROLLED', waitlistPosition: null },
      })
      await transaction.registration.updateMany({
        where: { classId: registration.classId, status: 'WAITLISTED' },
        data: { waitlistPosition: { decrement: 1 } },
      })
    }

    if (registration.membershipId) {
      const membership = await transaction.membership.findUnique({ where: { id: registration.membershipId } })
      if (membership && membership.classesRemaining !== null) {
        const newBalance = membership.classesRemaining + 1
        await transaction.membership.update({
          where: { id: membership.id },
          data: { classesRemaining: newBalance },
        })
        await transaction.membershipTransaction.create({
          data: {
            membershipId: membership.id,
            registrationId: registration.id,
            delta: 1,
            balanceAfter: newBalance,
          },
        })
      }
    }

    return cancelled
  })
}
