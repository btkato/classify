import { expect, test } from './fixtures'

let fullSetId: string
let dropInId: string
let categoryId: string
let testMembershipId: string

const instructorId = process.env['TEST_INSTRUCTOR_CLERK_ID'] ?? ''
const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

test.beforeAll(async () => {
  const { prisma, ClassStatus, EnrollmentType, MembershipStatus, MembershipType } = await import('db')

  const category = await prisma.classCategory.upsert({
    where: { name: 'E2E Series' },
    update: {},
    create: { name: 'E2E Series' },
  })
  categoryId = category.id

  // Clean up ALL stale lesson sets in this category from previous failed runs
  const staleSets = await prisma.lessonSet.findMany({
    where: { categoryId },
    include: { classes: { select: { id: true } } },
  })
  for (const staleSet of staleSets) {
    const staleClassIds = staleSet.classes.map((c) => c.id)
    if (staleClassIds.length > 0) {
      await prisma.registration.deleteMany({ where: { classId: { in: staleClassIds } } })
    }
    await prisma.class.deleteMany({ where: { lessonSetId: staleSet.id } })
    await prisma.lessonSet.delete({ where: { id: staleSet.id } })
  }

  const startsAt = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)

  const fullSet = await prisma.lessonSet.create({
    data: {
      title: 'E2E Full Set Series',
      enrollmentType: EnrollmentType.FULL_SET,
      totalSessions: 2,
      status: ClassStatus.ACTIVE,
      instructorId,
      categoryId,
    },
  })
  fullSetId = fullSet.id

  await prisma.class.createMany({
    data: [
      {
        title: 'E2E Full Set Series',
        sessionNumber: 1,
        lessonSetId: fullSetId,
        startsAt: startsAt(7),
        durationMinutes: 60,
        capacity: 10,
        status: ClassStatus.ACTIVE,
        instructorId,
        categoryId,
      },
      {
        title: 'E2E Full Set Series',
        sessionNumber: 2,
        lessonSetId: fullSetId,
        startsAt: startsAt(14),
        durationMinutes: 60,
        capacity: 10,
        status: ClassStatus.ACTIVE,
        instructorId,
        categoryId,
      },
    ],
  })

  const dropIn = await prisma.lessonSet.create({
    data: {
      title: 'E2E Drop-In Series',
      enrollmentType: EnrollmentType.DROP_IN,
      totalSessions: 2,
      status: ClassStatus.ACTIVE,
      instructorId,
      categoryId,
    },
  })
  dropInId = dropIn.id

  await prisma.class.createMany({
    data: [
      {
        title: 'E2E Drop-In Series',
        sessionNumber: 1,
        lessonSetId: dropInId,
        startsAt: startsAt(7),
        durationMinutes: 60,
        capacity: 10,
        status: ClassStatus.ACTIVE,
        instructorId,
        categoryId,
      },
      {
        title: 'E2E Drop-In Series',
        sessionNumber: 2,
        lessonSetId: dropInId,
        startsAt: startsAt(14),
        durationMinutes: 60,
        capacity: 10,
        status: ClassStatus.ACTIVE,
        instructorId,
        categoryId,
      },
    ],
  })

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

  const classes = await prisma.class.findMany({
    where: { lessonSetId: { in: [fullSetId, dropInId] } },
    select: { id: true },
  })
  const classIds = classes.map((c) => c.id)

  await prisma.registration.deleteMany({ where: { classId: { in: classIds } } })
  await prisma.class.deleteMany({ where: { lessonSetId: { in: [fullSetId, dropInId] } } })
  await prisma.lessonSet.deleteMany({ where: { id: { in: [fullSetId, dropInId] } } })
  await prisma.classCategory.deleteMany({
    where: { id: categoryId, classes: { none: {} }, lessonSets: { none: {} } },
  })
  await prisma.membership.deleteMany({ where: { id: testMembershipId } })

  await prisma.$disconnect()
})

test('student can enroll in a FULL_SET lesson set', async ({ asStudent }) => {
  await asStudent.goto(`/classes/lesson-sets/${fullSetId}`)
  await expect(asStudent.getByText('E2E Full Set Series')).toBeVisible()
  await asStudent.getByRole('button', { name: 'Enroll in Full Series' }).click()
  await expect(asStudent.getByText("You're enrolled in this series")).toBeVisible()
  await expect(asStudent.getByRole('button', { name: 'Cancel Series Enrollment' })).toBeVisible()
})

test('student can cancel a FULL_SET series enrollment', async ({ asStudent }) => {
  await asStudent.goto(`/classes/lesson-sets/${fullSetId}`)
  await expect(asStudent.getByText('E2E Full Set Series')).toBeVisible()
  await asStudent.getByRole('button', { name: 'Cancel Series Enrollment' }).click()
  await expect(asStudent.getByRole('button', { name: 'Enroll in Full Series' })).toBeVisible()
})

test('student can enroll in a DROP_IN session', async ({ asStudent }) => {
  await asStudent.goto(`/classes/lesson-sets/${dropInId}`)
  await expect(asStudent.getByText('Session 1')).toBeVisible()
  await asStudent.getByRole('button', { name: 'Enroll' }).first().click()
  await expect(asStudent.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

test('student can cancel a DROP_IN session enrollment', async ({ asStudent }) => {
  await asStudent.goto(`/classes/lesson-sets/${dropInId}`)
  await asStudent.getByRole('button', { name: 'Cancel' }).click()
  await expect(asStudent.getByRole('button', { name: 'Enroll' }).first()).toBeVisible()
})
