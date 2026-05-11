import path from 'node:path'
import { config } from 'dotenv'
import { clerkSetup } from '@clerk/testing/playwright'

// Load API env vars (DATABASE_URL, CLERK_SECRET_KEY, etc.) before anything else.
// clerkSetup also auto-loads apps/web/.env[.local] for VITE_CLERK_PUBLISHABLE_KEY.
config({ path: path.resolve(process.cwd(), '../api/.env') })

export default async function globalSetup() {
  await clerkSetup()

  const { prisma, Role } = await import('db')

  const testUsers = [
    {
      clerkId: process.env['TEST_STUDENT_CLERK_ID'] ?? '',
      email: 'studenttester@classify.com',
      firstName: 'Student',
      lastName: 'Tester',
      phone: '+15555550100',
      roles: [Role.STUDENT],
      isInstructor: false,
    },
    {
      clerkId: process.env['TEST_INSTRUCTOR_CLERK_ID'] ?? '',
      email: 'instructortester@classify.com',
      firstName: 'Instructor',
      lastName: 'Tester',
      phone: '+15555550101',
      roles: [Role.STUDENT, Role.INSTRUCTOR],
      isInstructor: true,
    },
    {
      clerkId: process.env['TEST_ADMIN_CLERK_ID'] ?? '',
      email: 'admintester@classify.com',
      firstName: 'Admin',
      lastName: 'Tester',
      phone: '+15555550102',
      roles: [Role.STUDENT, Role.ADMIN],
      isInstructor: false,
    },
  ]

  for (const userData of testUsers) {
    if (!userData.clerkId) {
      throw new Error(
        `Missing Clerk ID for ${userData.email}. ` +
          'Set TEST_STUDENT_CLERK_ID, TEST_INSTRUCTOR_CLERK_ID, and TEST_ADMIN_CLERK_ID in apps/api/.env',
      )
    }

    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.upsert({
        where: { id: userData.clerkId },
        update: {
          phone: userData.phone,
          dateOfBirth: new Date('1990-01-01'),
        },
        create: {
          id: userData.clerkId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          dateOfBirth: new Date('1990-01-01'),
        },
      })

      for (const role of userData.roles) {
        await transaction.userRole.upsert({
          where: { userId_role: { userId: user.id, role } },
          update: {},
          create: { userId: user.id, role },
        })
      }

      if (userData.isInstructor) {
        await transaction.instructorProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        })
      }
    })
  }

  await prisma.$disconnect()
}
