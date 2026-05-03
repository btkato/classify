import { prisma } from '../lib/prisma.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors.js'
import { getValidMembership } from './membershipService.js'
import type { Registration } from 'db'

const MS_PER_DAY = 1000 * 60 * 60 * 24

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

    const membership = await getValidMembership(userId, transaction)
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

export async function markAttended(
  registrationId: string,
  requesterId: string,
  isAdmin: boolean
): Promise<Registration> {
  return prisma.$transaction(async (transaction) => {
    const registration = await transaction.registration.findUnique({
      where: { id: registrationId },
      include: { class: { select: { instructorId: true } } },
    })

    if (!registration) throw new NotFoundError('Registration not found')
    if (!isAdmin && registration.class.instructorId !== requesterId) {
      throw new ForbiddenError('You are not the instructor for this class')
    }
    if (registration.status !== 'ENROLLED') {
      throw new ValidationError('Only ENROLLED registrations can be marked as attended')
    }

    const attended = await transaction.registration.update({
      where: { id: registrationId },
      data: { status: 'ATTENDED' },
    })

    const attendedCount = await transaction.registration.count({
      where: {
        userId: registration.userId,
        membershipId: registration.membershipId,
        status: 'ATTENDED',
      },
    })

    const matchingTriggers = await transaction.notificationTrigger.findMany({
      where: {
        isActive: true,
        triggerEvent: 'STUDENT_LESSON_COUNT_REACHED',
        threshold: attendedCount,
      },
    })

    if (matchingTriggers.length > 0) {
      const now = new Date()
      await transaction.notificationJob.createMany({
        data: matchingTriggers.map((trigger) => ({
          userId: registration.userId,
          membershipId: registration.membershipId,
          triggerId: trigger.id,
          triggerAt: new Date(now.getTime() + trigger.offsetDays * MS_PER_DAY),
        })),
      })
    }

    return attended
  })
}

export async function listRegistrations(userId: string) {
  return prisma.registration.findMany({
    where: { userId },
    include: {
      class: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          durationMinutes: true,
          location: true,
          status: true,
        },
      },
    },
    orderBy: { class: { startsAt: 'asc' } },
  })
}

export async function cancelRegistration(registrationId: string, userId: string): Promise<Registration> {
  return prisma.$transaction(async (transaction) => {
    const registration = await transaction.registration.findUnique({
      where: { id: registrationId },
    })

    if (!registration) throw new NotFoundError('Registration not found')
    if (registration.userId !== userId) throw new ForbiddenError('You do not have permission to cancel this registration')
    if (registration.status === 'CANCELLED') throw new ValidationError('Registration is already cancelled')
    if (registration.status === 'ATTENDED' || registration.status === 'ABSENT') {
      throw new ValidationError('Cannot cancel a completed registration')
    }

    const foundClass = await transaction.class.findUnique({
      where: { id: registration.classId },
      select: { lessonSet: { select: { enrollmentType: true } } },
    })
    if (foundClass?.lessonSet?.enrollmentType === 'FULL_SET') {
      throw new ValidationError('This class is part of a lesson set. Cancel the lesson set instead.')
    }

    const cancelled = await transaction.registration.update({
      where: { id: registrationId },
      data: { status: 'CANCELLED', waitlistPosition: null },
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

    const waitlisted = await transaction.registration.findMany({
      where: { classId: registration.classId, status: 'WAITLISTED' },
      orderBy: { waitlistPosition: 'asc' },
    })

    for (const candidate of waitlisted) {
      const membership = await getValidMembership(candidate.userId, transaction)
      if (!membership) continue

      await transaction.registration.update({
        where: { id: candidate.id },
        data: { status: 'ENROLLED', waitlistPosition: null, membershipId: membership.id },
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
            registrationId: candidate.id,
            delta: -1,
            balanceAfter: newBalance,
          },
        })
      }

      await transaction.registration.updateMany({
        where: {
          classId: registration.classId,
          status: 'WAITLISTED',
          waitlistPosition: { gt: candidate.waitlistPosition ?? 0 },
        },
        data: { waitlistPosition: { decrement: 1 } },
      })

      break
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
            registrationId: registrationId,
            delta: 1,
            balanceAfter: newBalance,
          },
        })
      }
    }

    return cancelled
  })
}
