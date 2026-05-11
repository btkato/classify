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
  asStudent: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAs(page, 'e2e-student@classify.test')
    await use(page)
    await context.close()
  },

  asInstructor: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAs(page, 'e2e-instructor@classify.test')
    await use(page)
    await context.close()
  },

  asAdmin: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAs(page, 'e2e-admin@classify.test')
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
