import { expect, test } from './fixtures'

test('unauthenticated user is redirected to /sign-in', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/sign-in/)
})

test.describe('incomplete profile redirect', () => {
  const studentId = process.env['TEST_STUDENT_CLERK_ID'] ?? ''

  test.beforeAll(async () => {
    const { prisma } = await import('db')
    await prisma.user.update({ where: { id: studentId }, data: { phone: null } })
    await prisma.$disconnect()
  })

  test.afterAll(async () => {
    const { prisma } = await import('db')
    await prisma.user.update({ where: { id: studentId }, data: { phone: '+15555550100' } })
    await prisma.$disconnect()
  })

  test('signed-in user with incomplete profile is redirected to /complete-profile', async ({ asStudent }) => {
    await expect(asStudent).toHaveURL(/complete-profile/)
  })
})

test('signed-in user with complete profile can access /dashboard', async ({ asStudent }) => {
  await asStudent.goto('/dashboard')
  await expect(asStudent).toHaveURL(/dashboard/)
})
