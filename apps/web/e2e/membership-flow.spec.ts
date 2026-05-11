import { expect, test } from './fixtures'

const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

test.beforeAll(async () => {
  const { prisma } = await import('db')
  const stale = await prisma.membership.findMany({
    where: { userId: studentId, type: 'CONTINUOUS_MONTHLY' },
    select: { id: true },
  })
  const staleIds = stale.map((m) => m.id)
  if (staleIds.length > 0) {
    await prisma.membershipTransaction.deleteMany({ where: { membershipId: { in: staleIds } } })
    await prisma.membership.deleteMany({ where: { id: { in: staleIds } } })
  }
  await prisma.$disconnect()
})

test.afterAll(async () => {
  const { prisma } = await import('db')
  const memberships = await prisma.membership.findMany({
    where: { userId: studentId, type: 'CONTINUOUS_MONTHLY' },
    select: { id: true },
  })
  const ids = memberships.map((m) => m.id)
  if (ids.length > 0) {
    await prisma.membershipTransaction.deleteMany({ where: { membershipId: { in: ids } } })
    await prisma.membership.deleteMany({ where: { id: { in: ids } } })
  }
  await prisma.$disconnect()
})

test('student can purchase a CONTINUOUS_MONTHLY membership', async ({ asStudent }) => {
  await asStudent.goto('/memberships/purchase')
  await asStudent.getByText('Continuous Monthly').click()
  await asStudent.getByRole('button', { name: 'Purchase' }).click()
  await expect(asStudent).toHaveURL(/\/memberships/)
  await expect(asStudent.getByText('Continuous Monthly').first()).toBeVisible()
})

test('student can cancel a membership', async ({ asStudent }) => {
  await asStudent.goto('/memberships')
  await expect(asStudent.getByText('Continuous Monthly').first()).toBeVisible()
  await asStudent.getByRole('button', { name: 'Cancel' }).click()
  await asStudent.getByRole('button', { name: 'Confirm Cancel' }).click()
  await expect(asStudent.getByText('No current memberships.')).toBeVisible()
})

test.describe('pause and resume', () => {
  test.beforeAll(async () => {
    const { prisma, MembershipStatus, MembershipType } = await import('db')
    await prisma.membership.create({
      data: {
        userId: studentId,
        type: MembershipType.CONTINUOUS_MONTHLY,
        status: MembershipStatus.PAUSED,
        priority: 1,
      },
    })
    await prisma.$disconnect()
  })

  test('student can resume a paused membership', async ({ asStudent }) => {
    await asStudent.goto('/memberships')
    await expect(asStudent.getByRole('button', { name: 'Resume' })).toBeVisible()
    await asStudent.getByRole('button', { name: 'Resume' }).click()
    await expect(asStudent.getByRole('button', { name: 'Resume' })).not.toBeVisible()
  })
})
