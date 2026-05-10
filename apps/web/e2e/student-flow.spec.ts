import { expect, test } from './fixtures'

let testClassId: string
let testCategoryId: string
let testMembershipId: string

const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

test.beforeAll(async () => {
  const { prisma, ClassStatus, MembershipStatus, MembershipType } = await import('db')

  const category = await prisma.classCategory.upsert({
    where: { name: 'E2E Yoga' },
    update: {},
    create: { name: 'E2E Yoga' },
  })
  testCategoryId = category.id

  const staleClasses = await prisma.class.findMany({
    where: { title: 'E2E Morning Yoga', categoryId: category.id },
    select: { id: true },
  })
  if (staleClasses.length > 0) {
    const staleIds = staleClasses.map((c) => c.id)
    await prisma.registration.deleteMany({ where: { classId: { in: staleIds } } })
    await prisma.class.deleteMany({ where: { id: { in: staleIds } } })
  }

  const testClass = await prisma.class.create({
    data: {
      title: 'E2E Morning Yoga',
      startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 10,
      status: ClassStatus.ACTIVE,
      instructorId: process.env['TEST_INSTRUCTOR_CLERK_ID'] ?? '',
      categoryId: category.id,
    },
  })
  testClassId = testClass.id

  const membership = await prisma.membership.create({
    data: {
      userId: studentId,
      type: MembershipType.CONTINUOUS_MONTHLY,
      status: MembershipStatus.ACTIVE,
      priority: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  testMembershipId = membership.id

  await prisma.$disconnect()
})

test.afterAll(async () => {
  const { prisma } = await import('db')
  await prisma.registration.deleteMany({ where: { classId: testClassId } })
  await prisma.class.delete({ where: { id: testClassId } })
  await prisma.classCategory.delete({ where: { id: testCategoryId } })
  await prisma.membership.deleteMany({ where: { id: testMembershipId } })
  await prisma.$disconnect()
})

test('student can browse the class list', async ({ asStudent }) => {
  await asStudent.goto('/classes')
  await expect(asStudent.getByText('E2E Morning Yoga')).toBeVisible()
})

test('student can search classes by title', async ({ asStudent }) => {
  await asStudent.goto('/classes')
  await asStudent.getByPlaceholder('Search classes...').fill('E2E Morning')
  await asStudent.getByRole('button', { name: 'Search' }).click()
  await expect(asStudent.getByText('E2E Morning Yoga')).toBeVisible()
})

test('student can filter classes by category', async ({ asStudent }) => {
  await asStudent.goto('/classes')
  await asStudent.getByRole('button', { name: 'E2E Yoga' }).click()
  await expect(asStudent.getByText('E2E Morning Yoga')).toBeVisible()
})

test('student can enroll in a class', async ({ asStudent }) => {
  await asStudent.goto(`/classes/${testClassId}`)
  await asStudent.getByRole('button', { name: 'Enroll' }).click()
  await expect(asStudent.getByRole('button', { name: 'Cancel enrollment' })).toBeVisible()
})

test('enrolled class appears on dashboard', async ({ asStudent }) => {
  await asStudent.goto('/dashboard')
  await expect(asStudent.getByText('E2E Morning Yoga')).toBeVisible()
})

test('student can cancel enrollment', async ({ asStudent }) => {
  await asStudent.goto(`/classes/${testClassId}`)
  await asStudent.getByRole('button', { name: 'Cancel enrollment' }).click()
  await expect(asStudent.getByRole('button', { name: 'Enroll' })).toBeVisible()
})
