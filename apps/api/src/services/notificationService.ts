import { prisma } from '../lib/prisma.js'
import { getIo } from '../lib/socket.js'
import type { Prisma, NotificationStatus } from 'db'

type NotificationJobWithRelations = Prisma.NotificationJobGetPayload<{
  include: { trigger: true; user: true; membership: true }
}>

export function interpolateTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => context[key] ?? match)
}

export async function processNotificationJobs(): Promise<void> {
  const now = new Date()

  const pendingJobs = await prisma.notificationJob.findMany({
    where: { status: 'PENDING', triggerAt: { lte: now } },
    include: { trigger: true, user: true, membership: true },
  })

  for (const job of pendingJobs) {
    try {
      await processOneJob(job)
    } catch {
      await prisma.notificationJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      })
    }
  }
}

async function processOneJob(job: NotificationJobWithRelations): Promise<void> {
  const senderId = job.trigger.createdByUserId

  const daysRemaining = job.membership?.expiresAt
    ? Math.ceil((job.membership.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  const context: Record<string, string> = {
    student: job.user.firstName,
    studio: 'Classify',
    remaining: job.membership?.classesRemaining?.toString() ?? '0',
    days: daysRemaining.toString(),
  }

  const body = interpolateTemplate(job.trigger.messageTemplate, context)

  const result = await prisma.$transaction(async (transaction) => {
    const currentJob = await transaction.notificationJob.findUnique({
      where: { id: job.id },
      select: { status: true },
    })
    if (!currentJob || currentJob.status !== 'PENDING') return null

    const existingThread = await transaction.messageThread.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: job.userId } } },
          { participants: { every: { userId: { in: [senderId, job.userId] } } } },
        ],
      },
    })

    let threadId: string
    if (existingThread) {
      threadId = existingThread.id
    } else {
      const newThread = await transaction.messageThread.create({
        data: { type: 'DIRECT' },
      })
      await transaction.threadParticipant.createMany({
        data: [
          { threadId: newThread.id, userId: senderId, canReply: true },
          { threadId: newThread.id, userId: job.userId, canReply: true },
        ],
      })
      threadId = newThread.id
    }

    const newMessage = await transaction.message.create({
      data: { threadId, senderId, body, triggerId: job.triggerId },
    })

    await transaction.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: newMessage.sentAt },
    })

    await transaction.notificationJob.update({
      where: { id: job.id },
      data: { status: 'SENT', sentAt: new Date() },
    })

    return { threadId, senderId }
  })

  if (result) {
    const io = getIo()
    io.to(`user:${result.senderId}`).emit('new-message', { threadId: result.threadId })
    io.to(`user:${job.userId}`).emit('new-message', { threadId: result.threadId })
  }
}

type NotificationJobSummary = Prisma.NotificationJobGetPayload<{
  include: {
    trigger: { select: { name: true } }
    user: { select: { firstName: true; lastName: true; email: true } }
  }
}>

interface ListNotificationJobsOptions {
  page: number
  pageSize: number
  status?: NotificationStatus
  triggerId?: string
}

export async function listNotificationJobs(options: ListNotificationJobsOptions): Promise<{
  data: NotificationJobSummary[]
  total: number
  page: number
  totalPages: number
}> {
  const { page, pageSize, status, triggerId } = options
  const skip = (page - 1) * pageSize
  const where = { status, triggerId }

  const [total, data] = await Promise.all([
    prisma.notificationJob.count({ where }),
    prisma.notificationJob.findMany({
      where,
      include: {
        trigger: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { triggerAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  return { data, total, page, totalPages: Math.ceil(total / pageSize) }
}
