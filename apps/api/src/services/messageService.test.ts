import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { createDirectMessage, getInbox, getThread, replyToThread } from './messageService.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findFirst: vi.fn() },
    messageThread: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    threadParticipant: { findMany: vi.fn(), findUnique: vi.fn(), createMany: vi.fn() },
    message: { create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockUserRoleFindFirst = vi.mocked(prisma.userRole.findFirst)
const mockMessageThreadFindFirst = vi.mocked(prisma.messageThread.findFirst)
const mockMessageThreadCreate = vi.mocked(prisma.messageThread.create)
const mockMessageThreadFindUnique = vi.mocked(prisma.messageThread.findUnique)
const mockThreadParticipantFindMany = vi.mocked(prisma.threadParticipant.findMany)
const mockThreadParticipantFindUnique = vi.mocked(prisma.threadParticipant.findUnique)
const mockThreadParticipantCreateMany = vi.mocked(prisma.threadParticipant.createMany)
const mockMessageCreate = vi.mocked(prisma.message.create)
const mockMessageUpdateMany = vi.mocked(prisma.message.updateMany)
const mockTransaction = vi.mocked(prisma.$transaction)

const adminId = 'user_admin_1'
const instructorId = 'user_instructor_1'
const threadId = 'thread_1'

const createdThread = {
  id: threadId,
  type: 'DIRECT' as const,
  classId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const createdMessage = {
  id: 'message_1',
  threadId,
  senderId: adminId,
  body: 'Hello!',
  triggerId: null,
  readAt: null,
  sentAt: new Date(),
}

beforeEach(() => {
  vi.resetAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
})

describe('createDirectMessage', () => {
  it('throws NotFoundError when instructor does not have INSTRUCTOR role', async () => {
    mockUserRoleFindFirst.mockResolvedValue(null)

    await expect(
      createDirectMessage({ adminId, instructorId, body: 'Hello!' })
    ).rejects.toThrow(NotFoundError)
  })

  it('creates a new DIRECT thread with participants and returns the message when no thread exists', async () => {
    mockUserRoleFindFirst.mockResolvedValue({ role: 'INSTRUCTOR' } as never)
    mockMessageThreadFindFirst.mockResolvedValue(null)
    mockMessageThreadCreate.mockResolvedValue(createdThread as never)
    mockThreadParticipantCreateMany.mockResolvedValue({ count: 2 })
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    const result = await createDirectMessage({ adminId, instructorId, body: 'Hello!' })

    expect(mockMessageThreadCreate).toHaveBeenCalledWith({ data: { type: 'DIRECT' } })
    expect(mockThreadParticipantCreateMany).toHaveBeenCalledWith({
      data: [
        { threadId, userId: adminId, canReply: true },
        { threadId, userId: instructorId, canReply: true },
      ],
    })
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId, senderId: adminId, body: 'Hello!' },
    })
    expect(result).toEqual(createdMessage)
  })

  it('reuses an existing DIRECT thread between admin and instructor', async () => {
    mockUserRoleFindFirst.mockResolvedValue({ role: 'INSTRUCTOR' } as never)
    mockMessageThreadFindFirst.mockResolvedValue(createdThread as never)
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    const result = await createDirectMessage({ adminId, instructorId, body: 'Hello!' })

    expect(mockMessageThreadCreate).not.toHaveBeenCalled()
    expect(mockThreadParticipantCreateMany).not.toHaveBeenCalled()
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId, senderId: adminId, body: 'Hello!' },
    })
    expect(result).toEqual(createdMessage)
  })
})

describe('getInbox', () => {
  const olderMessage = {
    id: 'message_old',
    threadId: 'thread_1',
    senderId: adminId,
    body: 'First message',
    sentAt: new Date('2026-01-10'),
    triggerId: null,
    readAt: null,
  }

  const newerMessage = {
    id: 'message_new',
    threadId: 'thread_2',
    senderId: instructorId,
    body: 'Later message',
    sentAt: new Date('2026-01-15'),
    triggerId: null,
    readAt: null,
  }

  const participation1 = {
    thread: {
      id: 'thread_1',
      type: 'DIRECT' as const,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [
        { userId: adminId, canReply: true },
        { userId: instructorId, canReply: true },
      ],
      messages: [olderMessage],
    },
  }

  const participation2 = {
    thread: {
      id: 'thread_2',
      type: 'ANNOUNCEMENT' as const,
      classId: 'class_1',
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [{ userId: instructorId, canReply: true }],
      messages: [newerMessage],
    },
  }

  it('returns an empty array when user has no participations', async () => {
    mockThreadParticipantFindMany.mockResolvedValue([] as never)

    const result = await getInbox('user_1')

    expect(result).toEqual([])
  })

  it('returns thread summaries sorted by latest message sentAt descending', async () => {
    mockThreadParticipantFindMany.mockResolvedValue([participation1, participation2] as never)

    const result = await getInbox('user_1')

    expect(result).toHaveLength(2)
    expect(result[0]?.threadId).toBe('thread_2')
    expect(result[1]?.threadId).toBe('thread_1')
    expect(result[0]?.latestMessage).toMatchObject({ id: 'message_new', body: 'Later message' })
  })

  it('returns latestMessage as null when the thread has no messages', async () => {
    const emptyParticipation = {
      thread: { ...participation1.thread, messages: [] },
    }
    mockThreadParticipantFindMany.mockResolvedValue([emptyParticipation] as never)

    const result = await getInbox('user_1')

    expect(result[0]?.latestMessage).toBeNull()
  })
})

describe('getThread', () => {
  const threadWithMessages = {
    id: threadId,
    type: 'DIRECT' as const,
    classId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { userId: adminId, canReply: true },
      { userId: instructorId, canReply: true },
    ],
    messages: [createdMessage],
  }

  it('throws ForbiddenError when user is not a participant', async () => {
    mockThreadParticipantFindUnique.mockResolvedValue(null)

    await expect(getThread('user_stranger', threadId)).rejects.toThrow(ForbiddenError)
  })

  it('returns thread detail and marks unread messages as read', async () => {
    mockThreadParticipantFindUnique.mockResolvedValue({ canReply: true } as never)
    mockMessageUpdateMany.mockResolvedValue({ count: 1 })
    mockMessageThreadFindUnique.mockResolvedValue(threadWithMessages as never)

    const result = await getThread(adminId, threadId)

    expect(mockMessageUpdateMany).toHaveBeenCalledWith({
      where: { threadId, senderId: { not: adminId }, readAt: null },
      data: { readAt: expect.any(Date) },
    })
    expect(result.threadId).toBe(threadId)
    expect(result.type).toBe('DIRECT')
    expect(result.messages).toHaveLength(1)
    expect(result.participants).toHaveLength(2)
  })
})

describe('replyToThread', () => {
  it('throws ForbiddenError when user is not a participant', async () => {
    mockThreadParticipantFindUnique.mockResolvedValue(null)

    await expect(
      replyToThread({ threadId, senderId: 'user_stranger', body: 'Reply!' })
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when participant cannot reply', async () => {
    mockThreadParticipantFindUnique.mockResolvedValue({ canReply: false } as never)

    await expect(
      replyToThread({ threadId, senderId: 'user_student', body: 'Reply!' })
    ).rejects.toThrow(ForbiddenError)
  })

  it('creates and returns the message when user can reply', async () => {
    mockThreadParticipantFindUnique.mockResolvedValue({ canReply: true } as never)
    mockMessageCreate.mockResolvedValue(createdMessage as never)

    const result = await replyToThread({ threadId, senderId: adminId, body: 'Hello!' })

    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId, senderId: adminId, body: 'Hello!' },
    })
    expect(result).toEqual(createdMessage)
  })
})
