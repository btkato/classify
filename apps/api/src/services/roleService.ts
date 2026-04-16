import { prisma } from '../lib/prisma.js'
import type { Role } from 'db'

export async function grantRole(userId: string, role: Role): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role },
      update: {},
    })

    if (role === 'INSTRUCTOR') {
      await transaction.instructorProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      })
    }
  })
}

export async function revokeRole(userId: string, role: Role): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await transaction.userRole.deleteMany({
      where: { userId, role },
    })

    if (role === 'INSTRUCTOR') {
      await transaction.instructorProfile.deleteMany({
        where: { userId },
      })
    }
  })
}
