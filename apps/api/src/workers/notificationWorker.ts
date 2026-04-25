import { Worker } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from '../env.js'
import { processNotificationJobs } from '../services/notificationService.js'

export function startNotificationWorker(): void {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

  const worker = new Worker(
    'notifications',
    async () => {
      await processNotificationJobs()
    },
    { connection }
  )

  worker.on('failed', (_job, error) => {
    console.error(`Notification poll failed: ${error.message}`)
  })
}
