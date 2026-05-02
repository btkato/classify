import { prisma } from '../lib/prisma.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { getValidMembership } from './membershipService.js'
import type { LessonSet, EnrollmentType, ClassStatus, Registration, TriggerEvent, Prisma } from 'db'

interface SessionOverride {
  sessionNumber: number
  startsAt?: Date
  location?: string
}

interface CreateLessonSetInput {
  title: string
  description?: string
  enrollmentType: EnrollmentType
  totalSessions: number
  instructorId: string
  categoryId: string
  capacity: number
  durationMinutes: number
  firstSessionStartsAt: Date
  intervalDays: number
  location?: string
  sessionOverrides?: SessionOverride[]
  status?: ClassStatus
}

interface UpdateLessonSetInput {
  title?: string
  description?: string
  status?: ClassStatus
}

export type LessonSetWithClasses = Prisma.LessonSetGetPayload<{
  include: { classes: true }
}>

const MS_PER_DAY = 1000 * 60 * 60 * 24

const SERIES_TRIGGER_EVENTS: TriggerEvent[] = ['CLASS_SERIES_NEARING_END', 'CLASS_SERIES_COMPLETE']

export async function createLessonSet(input: CreateLessonSetInput): Promise<LessonSet> {
  return prisma.$transaction(async (transaction) => {
    const lessonSetStatus = input.status ?? 'ACTIVE'

    const lessonSet = await transaction.lessonSet.create({
      data: {
        title: input.title,
        description: input.description,
        enrollmentType: input.enrollmentType,
        totalSessions: input.totalSessions,
        instructorId: input.instructorId,
        categoryId: input.categoryId,
        status: lessonSetStatus,
      },
    })

    const overridesBySession = new Map(
      input.sessionOverrides?.map((override) => [override.sessionNumber, override]) ?? []
    )

    for (let sessionIndex = 1; sessionIndex <= input.totalSessions; sessionIndex++) {
      const override = overridesBySession.get(sessionIndex)
      const defaultStartsAt = new Date(
        input.firstSessionStartsAt.getTime() +
          (sessionIndex - 1) * input.intervalDays * MS_PER_DAY
      )

      await transaction.class.create({
        data: {
          instructorId: input.instructorId,
          categoryId: input.categoryId,
          lessonSetId: lessonSet.id,
          sessionNumber: sessionIndex,
          title: input.title,
          capacity: input.capacity,
          durationMinutes: input.durationMinutes,
          startsAt: override?.startsAt ?? defaultStartsAt,
          location: override?.location ?? input.location,
          status: lessonSetStatus,
        },
      })
    }

    return lessonSet
  })
}

export async function listLessonSets(): Promise<LessonSet[]> {
  return prisma.lessonSet.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLessonSet(id: string): Promise<LessonSetWithClasses> {
  const lessonSet = await prisma.lessonSet.findUnique({
    where: { id },
    include: { classes: { orderBy: { sessionNumber: 'asc' } } },
  })

  if (!lessonSet) {
    throw new NotFoundError('Lesson set not found')
  }

  return lessonSet
}

export async function updateLessonSet(id: string, input: UpdateLessonSetInput): Promise<LessonSet> {
  return prisma.lessonSet.update({
    where: { id },
    data: input,
  })
}

export async function cancelLessonSet(id: string): Promise<LessonSet> {
  return prisma.$transaction(async (transaction) => {
    await transaction.class.updateMany({
      where: { lessonSetId: id },
      data: { status: 'CANCELLED' },
    })

    return transaction.lessonSet.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
  })
}

export async function enrollInLessonSet(
  lessonSetId: string,
  userId: string
): Promise<Registration[]> {
  const lessonSet = await prisma.lessonSet.findUnique({
    where: { id: lessonSetId },
    include: { classes: { where: { status: 'ACTIVE' }, orderBy: { sessionNumber: 'asc' } } },
  })

  if (!lessonSet) throw new NotFoundError('Lesson set not found')

  if (lessonSet.enrollmentType === 'DROP_IN') {
    throw new ValidationError('This lesson set does not support full-set enrollment. Enroll per session instead.')
  }

  if (lessonSet.status !== 'ACTIVE') {
    throw new ValidationError('This lesson set is not available for enrollment.')
  }

  if (lessonSet.classes.length === 0) {
    throw new ValidationError('This lesson set has no active sessions available for enrollment.')
  }

  const now = new Date()
  const firstSession = lessonSet.classes.at(0)
  if (firstSession !== undefined && firstSession.startsAt <= now) {
    throw new ValidationError('Cannot enroll in a lesson set that has already started')
  }

  return prisma.$transaction(async (transaction) => {
    const membership = await getValidMembership(userId, transaction)
    if (!membership) {
      throw new ValidationError('No valid membership found. Please purchase a membership to enroll.')
    }

    const sessionCount = lessonSet.classes.length
    if (membership.classesRemaining !== null && membership.classesRemaining < sessionCount) {
      throw new ValidationError(
        `Not enough class credits. You need ${sessionCount} credits to enroll in this lesson set.`
      )
    }

    const sessionIds = lessonSet.classes.map((session) => session.id)
    const enrolledCounts = await transaction.registration.groupBy({
      by: ['classId'],
      where: { classId: { in: sessionIds }, status: 'ENROLLED' },
      _count: { _all: true },
    })
    const enrolledCountByClassId = new Map(
      enrolledCounts.map((row) => [row.classId, row._count._all])
    )
    const allHaveSpace = lessonSet.classes.every(
      (session) => (enrolledCountByClassId.get(session.id) ?? 0) < session.capacity
    )

    const createdRegistrations: Registration[] = []

    for (const session of lessonSet.classes) {
      if (allHaveSpace) {
        const registration = await transaction.registration.create({
          data: { userId, classId: session.id, status: 'ENROLLED', membershipId: membership.id },
        })
        createdRegistrations.push(registration)
      } else {
        const lastWaitlisted = await transaction.registration.findFirst({
          where: { classId: session.id, status: 'WAITLISTED' },
          orderBy: { waitlistPosition: 'desc' },
        })
        const waitlistPosition = (lastWaitlisted?.waitlistPosition ?? 0) + 1
        const registration = await transaction.registration.create({
          data: { userId, classId: session.id, status: 'WAITLISTED', waitlistPosition },
        })
        createdRegistrations.push(registration)
      }
    }

    if (allHaveSpace && membership.classesRemaining !== null) {
      await transaction.membership.update({
        where: { id: membership.id },
        data: { classesRemaining: { decrement: sessionCount } },
      })
      for (const [index, registration] of createdRegistrations.entries()) {
        await transaction.membershipTransaction.create({
          data: {
            membershipId: membership.id,
            registrationId: registration.id,
            delta: -1,
            balanceAfter: membership.classesRemaining - (index + 1),
          },
        })
      }
    }

    const seriesTriggers = await transaction.notificationTrigger.findMany({
      where: { isActive: true, triggerEvent: { in: SERIES_TRIGGER_EVENTS } },
    })

    if (allHaveSpace && seriesTriggers.length > 0) {
      const lastSession = lessonSet.classes.at(-1)
      if (lastSession) {
        const lastSessionMs = lastSession.startsAt.getTime()
        const seriesJobs = seriesTriggers.map((trigger) => ({
          userId,
          membershipId: membership.id,
          triggerId: trigger.id,
          triggerAt:
            trigger.triggerEvent === 'CLASS_SERIES_NEARING_END'
              ? new Date(lastSessionMs - trigger.offsetDays * MS_PER_DAY)
              : new Date(lastSessionMs + trigger.offsetDays * MS_PER_DAY),
        }))
        await transaction.notificationJob.createMany({ data: seriesJobs })
      }
    }

    return createdRegistrations
  })
}

export async function cancelLessonSetRegistration(
  lessonSetId: string,
  userId: string
): Promise<void> {
  const lessonSet = await prisma.lessonSet.findUnique({
    where: { id: lessonSetId },
    include: { classes: { orderBy: { sessionNumber: 'asc' } } },
  })

  if (!lessonSet) {
    throw new NotFoundError('Lesson set not found')
  }

  const now = new Date()
  const firstSession = lessonSet.classes.at(0)
  const hasStarted = firstSession !== undefined && firstSession.startsAt <= now
  const classIds = lessonSet.classes.map((session) => session.id)

  await prisma.$transaction(async (transaction) => {
    const registrations = await transaction.registration.findMany({
      where: { classId: { in: classIds }, userId, status: { in: ['ENROLLED', 'WAITLISTED'] } },
      include: { class: { select: { startsAt: true } }, membership: true },
    })

    const registrationsToCancel = hasStarted
      ? registrations.filter((registration) => registration.class.startsAt > now)
      : registrations

    for (const registration of registrationsToCancel) {
      if (registration.status === 'WAITLISTED') {
        await transaction.registration.updateMany({
          where: {
            classId: registration.classId,
            status: 'WAITLISTED',
            waitlistPosition: { gt: registration.waitlistPosition ?? 0 },
          },
          data: { waitlistPosition: { decrement: 1 } },
        })
      }

      await transaction.registration.update({
        where: { id: registration.id },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    }

    if (!hasStarted) {
      type RefundGroup = { baseBalance: number; registrations: Array<{ id: string; membershipId: string }> }
      const refundGroups = new Map<string, RefundGroup>()

      for (const registration of registrationsToCancel) {
        if (
          registration.status === 'ENROLLED' &&
          registration.membershipId !== null &&
          registration.membership !== null &&
          registration.membership.classesRemaining !== null
        ) {
          const refundEntry = { id: registration.id, membershipId: registration.membershipId }
          const group = refundGroups.get(registration.membershipId)
          if (group) {
            group.registrations.push(refundEntry)
          } else {
            refundGroups.set(registration.membershipId, {
              baseBalance: registration.membership.classesRemaining,
              registrations: [refundEntry],
            })
          }
        }
      }

      for (const [membershipId, { baseBalance, registrations }] of refundGroups) {
        await transaction.membership.update({
          where: { id: membershipId },
          data: { classesRemaining: { increment: registrations.length } },
        })
        for (const [index, registration] of registrations.entries()) {
          await transaction.membershipTransaction.create({
            data: {
              membershipId,
              registrationId: registration.id,
              delta: 1,
              balanceAfter: baseBalance + (index + 1),
            },
          })
        }
      }
    }
  })
}
