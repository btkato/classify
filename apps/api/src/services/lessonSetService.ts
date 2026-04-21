import { prisma } from '../lib/prisma.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { getValidMembership } from './membershipService.js'
import type { LessonSet, EnrollmentType, ClassStatus, Registration, Prisma } from 'db'

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

export async function createLessonSet(input: CreateLessonSetInput): Promise<LessonSet> {
  return prisma.$transaction(async (transaction) => {
    const lessonSet = await transaction.lessonSet.create({
      data: {
        title: input.title,
        description: input.description,
        enrollmentType: input.enrollmentType,
        totalSessions: input.totalSessions,
        instructorId: input.instructorId,
        categoryId: input.categoryId,
        status: 'ACTIVE',
      },
    })

    for (let sessionIndex = 1; sessionIndex <= input.totalSessions; sessionIndex++) {
      const override = input.sessionOverrides?.find(
        (sessionOverride) => sessionOverride.sessionNumber === sessionIndex
      )
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
          status: 'ACTIVE',
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

export async function deleteLessonSet(id: string): Promise<LessonSet> {
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

    let allHaveSpace = true
    for (const session of lessonSet.classes) {
      const enrolledCount = await transaction.registration.count({
        where: { classId: session.id, status: 'ENROLLED' },
      })
      if (enrolledCount >= session.capacity) {
        allHaveSpace = false
        break
      }
    }

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
    const enrolledRegistrations = await transaction.registration.findMany({
      where: { classId: { in: classIds }, userId, status: 'ENROLLED' },
      include: { class: { select: { startsAt: true } }, membership: true },
    })

    const registrationsToCancel = hasStarted
      ? enrolledRegistrations.filter((registration) => registration.class.startsAt > now)
      : enrolledRegistrations

    for (const registration of registrationsToCancel) {
      if (
        !hasStarted &&
        registration.membershipId !== null &&
        registration.membership !== null &&
        registration.membership.classesRemaining !== null
      ) {
        await transaction.membership.update({
          where: { id: registration.membershipId },
          data: { classesRemaining: { increment: 1 } },
        })
        await transaction.membershipTransaction.create({
          data: {
            membershipId: registration.membershipId,
            registrationId: registration.id,
            delta: 1,
            balanceAfter: registration.membership.classesRemaining + 1,
          },
        })
      }

      await transaction.registration.update({
        where: { id: registration.id },
        data: { status: 'CANCELLED' },
      })
    }

    if (hasStarted) {
      const futureClassIds = lessonSet.classes
        .filter((session) => session.startsAt > now)
        .map((session) => session.id)

      if (futureClassIds.length > 0) {
        await transaction.registration.updateMany({
          where: { classId: { in: futureClassIds }, status: 'WAITLISTED' },
          data: { status: 'CANCELLED' },
        })
      }
    }
  })
}
