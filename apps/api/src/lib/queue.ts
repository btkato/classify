import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from '../env.js'

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

export const notificationQueue = new Queue('notifications', { connection })
