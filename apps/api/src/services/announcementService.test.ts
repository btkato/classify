import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { sendAnnouncement } from './announcementService.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    class: { findUnique: vi.fn() },
    messageThread: { findFirst: vi.fn(), create: vi.fn() },
    registration: { findMany: vi.fn() },
    threadParticipant: { createMany: vi.fn() },
    message: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockClassFindUnique = vi.mocked(prisma.class.findUnique)
const mockMessageThreadFindFirst = vi.mocked(prisma.messageThread.findFirst)
const mockMessageThreadCreate = vi.mocked(prisma.messageThread.create)
const mockRegistrationFindMany = vi.mocked(prisma.registration.findMany)
const mockThreadParticipantCreateMany = vi.mocked(prisma.threadParticipant.createMany)
const mockMessageCreate = vi.mocked(prisma.message.create)
const mockTransaction = vi.mocked(prisma.$transaction)

const senderId = 'user_instructor_1'
const classId = 'class_1'

const foundClass = {
  id: classId,
  instructorId: senderId,
}

const createdThread = {
  id: 'thread_1',
  type: 'ANNOUNCEMENT' as const,
  classId,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const createdMessage = {
  id: 'message_1',
  threadId: 'thread_1',
  senderId,
  body: 'Class is moved to Studio B.',
  triggerId: null,
  readAt: null,
  sentAt: new Date(),
}

beforeEach(() => {
  vi.resetAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
})

describe('sendAnnouncement', () => {
  it('throws NotFoundError when class does not exist', async () => {
    mockClassFindUnique.mockResolvedValue(null)

    await expect(
      sendAnnouncement({ classId, senderId, body: 'Hello' })
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when instructor is not assigned to the class', async () => {
    mockClassFindUnique.mockResolvedValue({ ...foundClass, instructorId: 'other_instructor' } as never)

    await expect(
      sendAnnouncement({ classId, senderId, body: 'Hello' })
    ).rejects.toThrow(ForbiddenError)
  })

  it('allows admin to send to a class they are not assigned to', async () => {
    mockClassFindUnique.mockResolvedValue({ ...foundClass, instructorId: 'other_instructor' } as never)
    mockMessageThreadFindFirst.mockResolvedValue(createdThread as never)
    mockRegistrationFindMany.mockResolvedValue([] as never)
    mockThreadParticipantCreateMany.mockResolvedValue({ count: 0 })
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    await expect(
      sendAnnouncement({ classId, senderId, body: 'Hello', isAdmin: true })
    ).resolves.toEqual(createdMessage)
  })

  it('creates a new thread with participants and returns the message when no thread exists', async () => {
    mockClassFindUnique.mockResolvedValue(foundClass as never)
    mockMessageThreadFindFirst.mockResolvedValue(null)
    mockRegistrationFindMany.mockResolvedValue([
      { userId: 'student_1' },
      { userId: 'student_2' },
    ] as never)
    mockMessageThreadCreate.mockResolvedValue(createdThread as never)
    mockThreadParticipantCreateMany.mockResolvedValue({ count: 3 })
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    const result = await sendAnnouncement({ classId, senderId, body: 'Class is moved to Studio B.' })

    expect(mockMessageThreadCreate).toHaveBeenCalledWith({
      data: { type: 'ANNOUNCEMENT', classId },
    })
    expect(mockThreadParticipantCreateMany).toHaveBeenCalledWith({
      data: [
        { threadId: createdThread.id, userId: senderId, canReply: true },
        { threadId: createdThread.id, userId: 'student_1', canReply: false },
        { threadId: createdThread.id, userId: 'student_2', canReply: false },
      ],
    })
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId: createdThread.id, senderId, body: 'Class is moved to Studio B.' },
    })
    expect(result).toEqual(createdMessage)
  })

  it('upserts current enrolled students and adds message to existing thread', async () => {
    mockClassFindUnique.mockResolvedValue(foundClass as never)
    mockMessageThreadFindFirst.mockResolvedValue(createdThread as never)
    mockRegistrationFindMany.mockResolvedValue([{ userId: 'student_3' }] as never)
    mockThreadParticipantCreateMany.mockResolvedValue({ count: 1 })
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    const result = await sendAnnouncement({ classId, senderId, body: 'Class is moved to Studio B.' })

    expect(mockMessageThreadCreate).not.toHaveBeenCalled()
    expect(mockThreadParticipantCreateMany).toHaveBeenCalledWith({
      data: [{ threadId: createdThread.id, userId: 'student_3', canReply: false }],
      skipDuplicates: true,
    })
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId: createdThread.id, senderId, body: 'Class is moved to Studio B.' },
    })
    expect(result).toEqual(createdMessage)
  })
})
