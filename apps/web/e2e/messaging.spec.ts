import { expect, test } from './fixtures'

let announcementThreadId: string
let messagingClassId: string
let messagingCategoryId: string

const adminId = process.env['TEST_ADMIN_CLERK_ID'] ?? ''
const instructorId = process.env['TEST_INSTRUCTOR_CLERK_ID'] ?? ''
const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

test.beforeAll(async () => {
  const { prisma, ClassStatus, ThreadType, RegistrationStatus } = await import('db')

  const category = await prisma.classCategory.upsert({
    where: { name: 'E2E Messaging' },
    update: {},
    create: { name: 'E2E Messaging' },
  })
  messagingCategoryId = category.id

  const testClass = await prisma.class.create({
    data: {
      title: 'E2E Messaging Class',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 10,
      status: ClassStatus.ACTIVE,
      instructorId,
      categoryId: category.id,
    },
  })
  messagingClassId = testClass.id

  await prisma.registration.create({
    data: { userId: studentId, classId: messagingClassId, status: RegistrationStatus.ENROLLED },
  })

  const now = new Date()
  const thread = await prisma.messageThread.create({
    data: {
      type: ThreadType.ANNOUNCEMENT,
      classId: messagingClassId,
      lastMessageAt: now,
      participants: {
        create: [
          { userId: instructorId, canReply: true },
          { userId: studentId, canReply: false },
        ],
      },
    },
  })
  announcementThreadId = thread.id

  await prisma.message.create({
    data: {
      threadId: thread.id,
      senderId: instructorId,
      body: 'Welcome to E2E Messaging Class!',
      sentAt: now,
    },
  })

  await prisma.$disconnect()
})

test.afterAll(async () => {
  const { prisma, ThreadType } = await import('db')

  const allDirectThreads = await prisma.messageThread.findMany({
    where: { type: ThreadType.DIRECT },
    include: { participants: { select: { userId: true } } },
  })
  const dmThread = allDirectThreads.find(
    (t) =>
      t.participants.some((p) => p.userId === adminId) &&
      t.participants.some((p) => p.userId === instructorId),
  )

  const threadIds = [announcementThreadId, ...(dmThread ? [dmThread.id] : [])]

  await prisma.message.deleteMany({ where: { threadId: { in: threadIds } } })
  await prisma.messageThread.deleteMany({ where: { id: { in: threadIds } } })
  await prisma.registration.deleteMany({ where: { classId: messagingClassId } })
  await prisma.class.delete({ where: { id: messagingClassId } })
  await prisma.classCategory.deleteMany({
    where: { id: messagingCategoryId, classes: { none: {} }, lessonSets: { none: {} } },
  })

  await prisma.$disconnect()
})

test('admin composes DM to instructor', async ({ asAdmin }) => {
  await asAdmin.goto('/inbox/compose')
  await asAdmin.getByTestId('instructor-combobox').click()
  await asAdmin.getByPlaceholder('Search instructors…').fill('Instructor')
  await asAdmin.getByText('Instructor Tester').click()
  await asAdmin.getByLabel('Message').fill('E2E test DM message')
  await asAdmin.getByRole('button', { name: 'Send Message' }).click()
  await expect(asAdmin).toHaveURL(/\/inbox/)
})

test('instructor sees DM as unread in inbox', async ({ asInstructor }) => {
  await asInstructor.goto('/inbox')
  await expect(
    asInstructor.getByRole('link').filter({ hasText: 'Admin Tester' }).locator('[data-testid^="unread-dot-"]')
  ).toBeVisible()
})

test('instructor replies to DM', async ({ asInstructor }) => {
  await asInstructor.goto('/inbox')
  await asInstructor.getByText('Admin Tester').click()
  await asInstructor.getByPlaceholder('Write a reply…').fill('E2E test reply')
  await asInstructor.getByRole('button', { name: 'Send' }).click()
  await expect(asInstructor.getByText('E2E test reply')).toBeVisible()
})

test('student sees class announcement as unread in inbox', async ({ asStudent }) => {
  await asStudent.goto('/inbox')
  await expect(asStudent.getByText('E2E Messaging Class', { exact: true })).toBeVisible()
  await expect(
    asStudent.locator(`[data-testid="unread-dot-${announcementThreadId}"]`)
  ).toBeVisible()
})
