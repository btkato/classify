import { prisma } from '../lib/prisma.js'
import { NotFoundError } from '../lib/errors.js'
import type { Prisma } from 'db'

interface CreateUserInput {
  clerkId: string
  email: string
  firstName: string
  lastName: string
}

interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  phone?: string
}

interface AdminUpdateUserInput extends UpdateProfileInput {
  dateOfBirth?: Date
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { id: input.clerkId },
    include: { roles: true },
  })
  if (existing) return existing

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    })

    await tx.userRole.create({
      data: { userId: user.id, role: 'STUDENT' },
    })

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: true },
    })
  })
}

function updateUserById(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    include: { roles: true },
  })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: true },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
}

export async function updateProfile(id: string, data: UpdateProfileInput) {
  return updateUserById(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
  })
}

export async function adminUpdateUser(id: string, data: AdminUpdateUserInput) {
  return updateUserById(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
  })
}
