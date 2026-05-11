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
    await signInAs(page, 'studenttester@classify.com')
    await use(page)
    await context.close()
  },

  asInstructor: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAs(page, 'instructortester@classify.com')
    await use(page)
    await context.close()
  },

  asAdmin: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAs(page, 'admintester@classify.com')
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
