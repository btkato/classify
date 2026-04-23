import { prisma } from '../lib/prisma.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js'
import type { Class, ClassStatus, Prisma } from 'db'

type RegistrationWithUser = Prisma.RegistrationGetPayload<{
  include: {
    user: {
      select: {
        id: true
        firstName: true
        lastName: true
        email: true
      }
    }
  }
}>

interface ListClassesInput {
  categoryId?: string
  instructorId?: string
  status?: ClassStatus
  from?: Date
  to?: Date
  page?: number
  pageSize?: number
}

export interface ClassPage {
  data: Class[]
  total: number
  page: number
  totalPages: number
}

interface CreateClassInput {
  instructorId: string
  categoryId: string
  title: string
  description?: string
  capacity: number
  startsAt: Date
  durationMinutes: number
  location?: string
  lessonSetId?: string
  sessionNumber?: number
}

export async function listClasses(input: ListClassesInput): Promise<ClassPage> {
  const page = input.page ?? 1
  const pageSize = input.pageSize ?? 10
  const skip = (page - 1) * pageSize

  const startsAt =
    input.from !== undefined || input.to !== undefined
      ? { gte: input.from, lte: input.to }
      : undefined

  const where = {
    categoryId: input.categoryId,
    instructorId: input.instructorId,
    status: input.status,
    startsAt,
  }

  const [data, total] = await Promise.all([
    prisma.class.findMany({ where, orderBy: { startsAt: 'asc' }, skip, take: pageSize }),
    prisma.class.count({ where }),
  ])

  return { data, total, page, totalPages: Math.ceil(total / pageSize) }
}

export type ClassWithEnrolledCount = Class & { enrolledCount: number }

export async function getClass(id: string): Promise<ClassWithEnrolledCount> {
  const foundClass = await prisma.class.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: { where: { status: 'ENROLLED' } },
        },
      },
    },
  })

  if (!foundClass) {
    throw new NotFoundError('Class not found')
  }

  const { _count, ...rest } = foundClass
  return { ...rest, enrolledCount: _count.registrations }
}

interface UpdateClassInput {
  title?: string
  description?: string | null
  capacity?: number
  startsAt?: Date
  durationMinutes?: number
  location?: string | null
}

export async function updateClass(
  id: string,
  input: UpdateClassInput,
  requesterId: string,
  isAdmin: boolean
): Promise<Class> {
  const existingClass = await prisma.class.findUnique({ where: { id } })

  if (!existingClass) {
    throw new NotFoundError('Class not found')
  }

  if (existingClass.instructorId !== requesterId && !isAdmin) {
    throw new ForbiddenError('You do not have permission to update this class')
  }

  const adminOnlyFields: (keyof UpdateClassInput)[] = ['title', 'capacity', 'startsAt', 'durationMinutes']
  if (!isAdmin && adminOnlyFields.some((field) => input[field] !== undefined)) {
    throw new ForbiddenError('Instructors may only update description and location')
  }

  if (input.startsAt !== undefined && input.startsAt <= new Date()) {
    throw new ValidationError('Class must start in the future')
  }

  return prisma.class.update({
    where: { id },
    data: input,
  })
}

export async function cancelClass(id: string): Promise<Class> {
  return prisma.class.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })
}

export async function getRoster(
  classId: string,
  requesterId: string,
  isAdmin: boolean
): Promise<RegistrationWithUser[]> {
  const foundClass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      registrations: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { waitlistPosition: 'asc' },
      },
    },
  })

  if (!foundClass) {
    throw new NotFoundError('Class not found')
  }

  if (foundClass.instructorId !== requesterId && !isAdmin) {
    throw new ForbiddenError('You do not have permission to view this roster')
  }

  return foundClass.registrations
}

export async function createClass(input: CreateClassInput): Promise<Class> {
  if (input.startsAt <= new Date()) {
    throw new ValidationError('Class must start in the future')
  }

  return prisma.class.create({
    data: {
      instructorId: input.instructorId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      capacity: input.capacity,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      location: input.location,
      lessonSetId: input.lessonSetId,
      sessionNumber: input.sessionNumber,
      status: 'ACTIVE',
    },
  })
}
