import { prisma } from '../lib/prisma.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'
import type { Message } from 'db'

interface AnnouncementsResult {
  threadId: string | null
  messages: Message[]
}

export async function getClassAnnouncements(classId: string): Promise<AnnouncementsResult> {
  const foundClass = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  })
  if (!foundClass) throw new NotFoundError('Class not found')

  const foundThread = await prisma.messageThread.findFirst({
    where: { classId, type: 'ANNOUNCEMENT' },
    select: { id: true },
  })

  if (!foundThread) return { threadId: null, messages: [] }

  const messages = await prisma.message.findMany({
    where: { threadId: foundThread.id },
    orderBy: { sentAt: 'asc' },
  })

  return { threadId: foundThread.id, messages }
}

interface SendAnnouncementInput {
  classId: string
  senderId: string
  body: string
  isAdmin?: boolean
}

export async function sendAnnouncement(input: SendAnnouncementInput): Promise<Message> {
  const foundClass = await prisma.class.findUnique({
    where: { id: input.classId },
    select: { id: true, instructorId: true },
  })
  if (!foundClass) throw new NotFoundError('Class not found')
  if (!input.isAdmin && foundClass.instructorId !== input.senderId) {
    throw new ForbiddenError('You are not assigned to this class')
  }

  return prisma.$transaction(async (transaction) => {
    const foundThread = await transaction.messageThread.findFirst({
      where: { classId: input.classId, type: 'ANNOUNCEMENT' },
    })

    const enrolledRegistrations = await transaction.registration.findMany({
      where: { classId: input.classId, status: 'ENROLLED' },
      select: { userId: true },
    })

    if (!foundThread) {
      const newThread = await transaction.messageThread.create({
        data: { type: 'ANNOUNCEMENT', classId: input.classId },
      })

      await transaction.threadParticipant.createMany({
        data: [
          { threadId: newThread.id, userId: input.senderId, canReply: true },
          ...enrolledRegistrations.map((registration) => ({
            threadId: newThread.id,
            userId: registration.userId,
            canReply: false,
          })),
        ],
      })

      const newMessage = await transaction.message.create({
        data: { threadId: newThread.id, senderId: input.senderId, body: input.body },
      })
      await transaction.messageThread.update({
        where: { id: newThread.id },
        data: { lastMessageAt: newMessage.sentAt },
      })
      return newMessage
    }

    await transaction.threadParticipant.deleteMany({
      where: { threadId: foundThread.id },
    })

    await transaction.threadParticipant.createMany({
      data: [
        { threadId: foundThread.id, userId: input.senderId, canReply: true },
        ...enrolledRegistrations.map((registration) => ({
          threadId: foundThread.id,
          userId: registration.userId,
          canReply: false,
        })),
      ],
    })

    const newMessage = await transaction.message.create({
      data: { threadId: foundThread.id, senderId: input.senderId, body: input.body },
    })
    await transaction.messageThread.update({
      where: { id: foundThread.id },
      data: { lastMessageAt: newMessage.sentAt },
    })
    return newMessage
  })
}
