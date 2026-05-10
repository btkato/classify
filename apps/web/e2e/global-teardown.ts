import path from 'node:path'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '../api/.env') })

export default async function globalTeardown() {
  const { prisma } = await import('db')

  const clerkIds = [
    process.env['TEST_STUDENT_CLERK_ID'],
    process.env['TEST_INSTRUCTOR_CLERK_ID'],
    process.env['TEST_ADMIN_CLERK_ID'],
  ].filter((id): id is string => !!id)

  const membershipIds = (
    await prisma.membership.findMany({ where: { userId: { in: clerkIds } }, select: { id: true } })
  ).map((membership) => membership.id)

  const registrationIds = (
    await prisma.registration.findMany({ where: { userId: { in: clerkIds } }, select: { id: true } })
  ).map((registration) => registration.id)

  await prisma.notificationJob.deleteMany({ where: { userId: { in: clerkIds } } })
  await prisma.message.deleteMany({ where: { senderId: { in: clerkIds } } })
  await prisma.threadParticipant.deleteMany({ where: { userId: { in: clerkIds } } })
  await prisma.membershipTransaction.deleteMany({
    where: {
      OR: [
        { membershipId: { in: membershipIds } },
        { registrationId: { in: registrationIds } },
      ],
    },
  })
  await prisma.registration.deleteMany({ where: { userId: { in: clerkIds } } })
  await prisma.membership.deleteMany({ where: { userId: { in: clerkIds } } })
  await prisma.user.deleteMany({ where: { id: { in: clerkIds } } })

  await prisma.$disconnect()
}
