import { prisma } from '../lib/prisma.js'
import { getIo } from '../lib/socket.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'
import type { Message, ThreadType } from 'db'

interface ParticipantSummary {
  userId: string
  canReply: boolean
  user: { firstName: string; lastName: string }
}

interface ThreadSummary {
  threadId: string
  type: ThreadType
  classId: string | null
  className: string | null
  participants: ParticipantSummary[]
  latestMessage: {
    id: string
    body: string
    sentAt: Date
    senderId: string
    readAt: Date | null
  } | null
}

interface ThreadDetail {
  threadId: string
  type: ThreadType
  classId: string | null
  participants: ParticipantSummary[]
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

  const { newMessage, threadId } = await prisma.$transaction(async (transaction) => {
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
      const newMessage = await transaction.message.create({
        data: { threadId: existingThread.id, senderId: input.adminId, body: input.body },
      })
      await transaction.messageThread.update({
        where: { id: existingThread.id },
        data: { lastMessageAt: newMessage.sentAt },
      })
      return { newMessage, threadId: existingThread.id }
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

    const newMessage = await transaction.message.create({
      data: { threadId: newThread.id, senderId: input.adminId, body: input.body },
    })
    await transaction.messageThread.update({
      where: { id: newThread.id },
      data: { lastMessageAt: newMessage.sentAt },
    })
    return { newMessage, threadId: newThread.id }
  })

  const io = getIo()
  io.to(`user:${input.adminId}`).emit('new-message', { threadId })
  io.to(`user:${input.instructorId}`).emit('new-message', { threadId })

  return newMessage
}

export async function getInbox(userId: string): Promise<ThreadSummary[]> {
  const threads = await prisma.messageThread.findMany({
    where: { participants: { some: { userId } } },
    include: {
      class: { select: { title: true } },
      participants: { select: { userId: true, canReply: true, user: { select: { firstName: true, lastName: true } } } },
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  return threads.map((thread) => {
    const latestMessage = thread.messages[0] ?? null
    return {
      threadId: thread.id,
      type: thread.type,
      classId: thread.classId,
      className: thread.class?.title ?? null,
      participants: thread.participants,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            body: latestMessage.body,
            sentAt: latestMessage.sentAt,
            senderId: latestMessage.senderId,
            readAt: latestMessage.readAt,
          }
        : null,
    }
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
        participants: { select: { userId: true, canReply: true, user: { select: { firstName: true, lastName: true } } } },
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

  const newMessage = await prisma.$transaction(async (transaction) => {
    const newMessage = await transaction.message.create({
      data: { threadId: input.threadId, senderId: input.senderId, body: input.body },
    })
    await transaction.messageThread.update({
      where: { id: input.threadId },
      data: { lastMessageAt: newMessage.sentAt },
    })
    return newMessage
  })

  const participants = await prisma.threadParticipant.findMany({
    where: { threadId: input.threadId },
    select: { userId: true },
  })
  const io = getIo()
  for (const participant of participants) {
    io.to(`user:${participant.userId}`).emit('new-message', { threadId: input.threadId })
  }

  return newMessage
}
