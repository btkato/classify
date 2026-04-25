import { prisma } from '../lib/prisma.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'
import type { Message, ThreadType } from 'db'

interface ThreadSummary {
  threadId: string
  type: ThreadType
  classId: string | null
  participants: Array<{ userId: string; canReply: boolean }>
  latestMessage: {
    id: string
    body: string
    sentAt: Date
    senderId: string
  } | null
}

interface ThreadDetail {
  threadId: string
  type: ThreadType
  classId: string | null
  participants: Array<{ userId: string; canReply: boolean }>
  messages: Message[]
}

export async function createDirectMessage(input: {
  adminId: string
  instructorId: string
  body: string
}): Promise<Message> {
  const instructorRole = await prisma.userRole.findFirst({
    where: { userId: input.instructorId, role: 'INSTRUCTOR' },
  })
  if (!instructorRole) throw new NotFoundError('Instructor not found')

  return prisma.$transaction(async (transaction) => {
    const existingThread = await transaction.messageThread.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: input.adminId } } },
          { participants: { some: { userId: input.instructorId } } },
        ],
      },
    })

    if (existingThread) {
      return transaction.message.create({
        data: { threadId: existingThread.id, senderId: input.adminId, body: input.body },
      })
    }

    const newThread = await transaction.messageThread.create({
      data: { type: 'DIRECT' },
    })

    await transaction.threadParticipant.createMany({
      data: [
        { threadId: newThread.id, userId: input.adminId, canReply: true },
        { threadId: newThread.id, userId: input.instructorId, canReply: true },
      ],
    })

    return transaction.message.create({
      data: { threadId: newThread.id, senderId: input.adminId, body: input.body },
    })
  })
}

export async function getInbox(userId: string): Promise<ThreadSummary[]> {
  const participations = await prisma.threadParticipant.findMany({
    where: { userId },
    include: {
      thread: {
        include: {
          participants: { select: { userId: true, canReply: true } },
          messages: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  const summaries = participations.map((participation) => {
    const { thread } = participation
    const latestMessage = thread.messages[0] ?? null
    return {
      threadId: thread.id,
      type: thread.type,
      classId: thread.classId,
      participants: thread.participants,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            body: latestMessage.body,
            sentAt: latestMessage.sentAt,
            senderId: latestMessage.senderId,
          }
        : null,
    }
  })

  return summaries.sort((a, b) => {
    if (!a.latestMessage && !b.latestMessage) return 0
    if (!a.latestMessage) return 1
    if (!b.latestMessage) return -1
    return b.latestMessage.sentAt.getTime() - a.latestMessage.sentAt.getTime()
  })
}

export async function getThread(userId: string, threadId: string): Promise<ThreadDetail> {
  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { canReply: true },
  })
  if (!participant) throw new ForbiddenError('You are not a participant in this thread')

  return prisma.$transaction(async (transaction) => {
    await transaction.message.updateMany({
      where: { threadId, senderId: { not: userId }, readAt: null },
      data: { readAt: new Date() },
    })

    const foundThread = await transaction.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: { select: { userId: true, canReply: true } },
        messages: { orderBy: { sentAt: 'asc' } },
      },
    })

    if (!foundThread) throw new NotFoundError('Thread not found')

    return {
      threadId: foundThread.id,
      type: foundThread.type,
      classId: foundThread.classId,
      participants: foundThread.participants,
      messages: foundThread.messages,
    }
  })
}

export async function replyToThread(input: {
  threadId: string
  senderId: string
  body: string
}): Promise<Message> {
  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: input.threadId, userId: input.senderId } },
    select: { canReply: true },
  })

  if (!participant) throw new ForbiddenError('You are not a participant in this thread')
  if (!participant.canReply)
    throw new ForbiddenError('You do not have permission to reply in this thread')

  return prisma.message.create({
    data: { threadId: input.threadId, senderId: input.senderId, body: input.body },
  })
}
