import { prisma } from '../lib/prisma.js'
import type { Prisma } from 'db'

interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  phone?: string
}

interface AdminUpdateUserInput extends UpdateProfileInput {
  dateOfBirth?: Date
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
    throw new Error('User not found')
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
