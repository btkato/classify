import { test as base, type Page } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

async function signInAs(page: Page, emailAddress: string): Promise<void> {
  await page.goto('/')
  await clerk.signIn({ page, emailAddress })
}

export const test = base.extend<{
  asStudent: Page
  asInstructor: Page
  asAdmin: Page
}>({
  asStudent: async ({ page }, use) => {
    await signInAs(page, 'e2e-student@classify.test')
    await use(page)
  },

  asInstructor: async ({ page }, use) => {
    await signInAs(page, 'e2e-instructor@classify.test')
    await use(page)
  },

  asAdmin: async ({ page }, use) => {
    await signInAs(page, 'e2e-admin@classify.test')
    await use(page)
  },
})

export { expect } from '@playwright/test'
