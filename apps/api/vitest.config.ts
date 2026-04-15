import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://mock:mock@mock/mock',
      CLERK_SECRET_KEY: 'test_secret_key',
      CLERK_WEBHOOK_SECRET: 'whsec_test',
    },
  },
})
