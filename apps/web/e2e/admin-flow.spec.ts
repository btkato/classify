import { expect, test } from './fixtures'

const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''
let membershipId: string

test.beforeAll(async () => {
  const { prisma, Role, MembershipType, MembershipStatus } = await import('db')

  // Remove any stale INSTRUCTOR grant from a previous failed run
  await prisma.instructorProfile.deleteMany({ where: { userId: studentId } })
  await prisma.userRole.deleteMany({ where: { userId: studentId, role: Role.INSTRUCTOR } })

  // Remove any stale test category
  await prisma.classCategory.deleteMany({ where: { name: 'E2E Admin Category' } })

  // Create an ACTIVE DROP_IN membership for the student to cancel via admin panel
  const membership = await prisma.membership.create({
    data: {
      userId: studentId,
      type: MembershipType.DROP_IN,
      status: MembershipStatus.ACTIVE,
      priority: 2,
    },
  })
  membershipId = membership.id

  await prisma.$disconnect()
})

test.afterAll(async () => {
  const { prisma, Role } = await import('db')

  await prisma.instructorProfile.deleteMany({ where: { userId: studentId } })
  await prisma.userRole.deleteMany({ where: { userId: studentId, role: Role.INSTRUCTOR } })
  await prisma.membership.deleteMany({ where: { id: membershipId } })
  await prisma.classCategory.deleteMany({ where: { name: 'E2E Admin Category' } })

  await prisma.$disconnect()
})

test('admin can create a class category', async ({ asAdmin }) => {
  await asAdmin.goto('/admin/categories')
  await asAdmin.getByPlaceholder('New category name').fill('E2E Admin Category')
  await asAdmin.getByRole('button', { name: 'Add' }).click()
  await expect(asAdmin.getByText('E2E Admin Category')).toBeVisible()
})

test('admin can delete a class category', async ({ asAdmin }) => {
  const { prisma } = await import('db')
  const category = await prisma.classCategory.findUnique({ where: { name: 'E2E Admin Category' } })
  await prisma.$disconnect()

  if (!category) throw new Error('E2E Admin Category not found — did the create test pass?')

  await asAdmin.goto('/admin/categories')
  await asAdmin.getByTestId(`delete-${category.id}`).click()
  await asAdmin.getByRole('button', { name: 'Delete category' }).click()
  await expect(asAdmin.getByText('E2E Admin Category', { exact: true })).not.toBeVisible()
})

test('admin can grant instructor role to a student', async ({ asAdmin }) => {
  await asAdmin.goto(`/admin/users/${studentId}`)
  await asAdmin.getByTestId('grant-INSTRUCTOR').click()
  await expect(asAdmin.getByTestId('revoke-INSTRUCTOR')).toBeVisible()
})

test('student with instructor role can access instructor pages', async ({ asStudent }) => {
  await asStudent.goto('/instructor')
  await expect(asStudent).toHaveURL(/\/instructor/)
})

test('admin can cancel a membership from the admin panel', async ({ asAdmin }) => {
  await asAdmin.goto('/admin/memberships')
  await asAdmin.getByPlaceholder('Search by name or email…').fill('studenttester@classify.com')
  await expect(asAdmin.getByTestId(`cancel-${membershipId}`)).toBeVisible()
  await asAdmin.getByTestId(`cancel-${membershipId}`).click()
  await asAdmin.getByRole('button', { name: 'Cancel membership' }).click()
  await expect(asAdmin.getByTestId(`cancel-${membershipId}`)).not.toBeVisible()
})
