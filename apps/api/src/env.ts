import { z } from 'zod'
import { config } from 'dotenv'

config()

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.string().default('3000'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
})

export const env = envSchema.parse(process.env)
