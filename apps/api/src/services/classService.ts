import { prisma } from '../lib/prisma.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js'
import type { Class } from 'db'

interface ListClassesInput {
  categoryId?: string
  from?: Date
  to?: Date
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
  recurringGroupId?: string
}

export async function listClasses(input: ListClassesInput): Promise<Class[]> {
  return prisma.class.findMany({
    where: {
      status: 'ACTIVE',
      categoryId: input.categoryId,
      startsAt: {
        gte: input.from ?? new Date(),
        lte: input.to,
      },
    },
    orderBy: { startsAt: 'asc' },
  })
}

export async function getClass(id: string): Promise<Class> {
  const foundClass = await prisma.class.findUnique({ where: { id } })

  if (!foundClass) {
    throw new NotFoundError('Class not found')
  }

  return foundClass
}

interface UpdateClassInput {
  title?: string
  description?: string
  capacity?: number
  startsAt?: Date
  durationMinutes?: number
  location?: string
  recurringGroupId?: string
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

  if (input.startsAt !== undefined && input.startsAt <= new Date()) {
    throw new ValidationError('Class must start in the future')
  }

  return prisma.class.update({
    where: { id },
    data: input,
  })
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
      recurringGroupId: input.recurringGroupId,
    },
  })
}
