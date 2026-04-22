import { prisma } from '../lib/prisma.js'
import { NotFoundError } from '../lib/errors.js'
import type { Prisma, Role } from 'db'

type UserWithRoles = Prisma.UserGetPayload<{ include: { roles: true } }>

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

export async function createUser(input: CreateUserInput): Promise<UserWithRoles> {
  const existing = await prisma.user.findUnique({
    where: { id: input.clerkId },
    include: { roles: true },
  })
  if (existing) return existing

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        id: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    })

    await transaction.userRole.create({
      data: { userId: user.id, role: 'STUDENT' },
    })

    return transaction.user.findUniqueOrThrow({
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

export async function getUserById(id: string): Promise<UserWithRoles> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: true },
  })

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
}

export async function updateProfile(id: string, data: UpdateProfileInput): Promise<UserWithRoles> {
  return updateUserById(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
  })
}

export async function adminUpdateUser(id: string, data: AdminUpdateUserInput): Promise<UserWithRoles> {
  return updateUserById(id, {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
  })
}

interface ListUsersInput {
  page: number
  pageSize: number
  search?: string
  role?: Role
}

export interface UserPage {
  data: UserWithRoles[]
  total: number
  page: number
  totalPages: number
}

export async function listUsers(input: ListUsersInput): Promise<UserPage> {
  const skip = (input.page - 1) * input.pageSize

  const conditions: Prisma.UserWhereInput[] = []

  if (input.role) {
    conditions.push({ roles: { some: { role: input.role } } })
  }

  if (input.search) {
    conditions.push({
      OR: [
        { firstName: { contains: input.search, mode: 'insensitive' } },
        { lastName: { contains: input.search, mode: 'insensitive' } },
        { email: { contains: input.search, mode: 'insensitive' } },
      ],
    })
  }

  const where: Prisma.UserWhereInput = conditions.length > 0 ? { AND: conditions } : {}

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { roles: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: input.pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return { data, total, page: input.page, totalPages: Math.ceil(total / input.pageSize) }
}
