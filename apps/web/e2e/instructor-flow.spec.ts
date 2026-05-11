import { expect, test } from './fixtures'

let classId: string
let categoryId: string

const instructorId = process.env['TEST_INSTRUCTOR_CLERK_ID'] ?? ''
const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

test.beforeAll(async () => {
  const { prisma, ClassStatus, RegistrationStatus } = await import('db')

  const category = await prisma.classCategory.upsert({
    where: { name: 'E2E Instructor' },
    update: {},
    create: { name: 'E2E Instructor' },
  })
  categoryId = category.id

  const testClass = await prisma.class.create({
    data: {
      title: 'E2E Instructor Class',
      startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: 60,
      capacity: 10,
      status: ClassStatus.ACTIVE,
      instructorId,
      categoryId,
    },
  })
  classId = testClass.id

  await prisma.registration.create({
    data: {
      userId: studentId,
      classId,
      status: RegistrationStatus.ENROLLED,
    },
  })

  await prisma.$disconnect()
})

test.afterAll(async () => {
  const { prisma } = await import('db')
  await prisma.registration.deleteMany({ where: { classId } })
  await prisma.class.delete({ where: { id: classId } })
  await prisma.classCategory.deleteMany({
    where: { id: categoryId, classes: { none: {} }, lessonSets: { none: {} } },
  })
  await prisma.$disconnect()
})

test('instructor can view their assigned class list', async ({ asInstructor }) => {
  await asInstructor.goto('/instructor/classes')
  await expect(asInstructor.getByText('E2E Instructor Class')).toBeVisible()
})

test('instructor can update class description and changes persist', async ({ asInstructor }) => {
  await asInstructor.goto(`/instructor/classes/${classId}`)
  await asInstructor.getByLabel('Description').fill('E2E test description update')
  await asInstructor.getByRole('button', { name: 'Save Changes' }).click()
  await expect(asInstructor.getByText('Changes saved.')).toBeVisible()

  await asInstructor.goto('/instructor/classes')
  await asInstructor.goto(`/instructor/classes/${classId}`)
  await expect(asInstructor.getByLabel('Description')).toHaveValue('E2E test description update')
})

test('instructor can view the class roster', async ({ asInstructor }) => {
  await asInstructor.goto(`/instructor/classes/${classId}/roster`)
  await expect(asInstructor.getByText('Student Tester')).toBeVisible()
  await expect(asInstructor.getByText('studenttester@classify.com')).toBeVisible()
})
