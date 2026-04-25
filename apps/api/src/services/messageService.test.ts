import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { getIo } from '../lib/socket.js'
import { createDirectMessage, getInbox, getThread, replyToThread } from './messageService.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'

const { mockEmit, mockTo } = vi.hoisted(() => {
  const mockEmit = vi.fn()
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit })
  return { mockEmit, mockTo }
})

vi.mock('../lib/socket.js', () => ({
  getIo: vi.fn().mockReturnValue({ to: mockTo }),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findFirst: vi.fn() },
    messageThread: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    threadParticipant: { findUnique: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    message: { create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockUserRoleFindFirst = vi.mocked(prisma.userRole.findFirst)
const mockMessageThreadFindFirst = vi.mocked(prisma.messageThread.findFirst)
const mockMessageThreadCreate = vi.mocked(prisma.messageThread.create)
const mockMessageThreadFindUnique = vi.mocked(prisma.messageThread.findUnique)
const mockMessageThreadUpdate = vi.mocked(prisma.messageThread.update)
const mockMessageThreadFindMany = vi.mocked(prisma.messageThread.findMany)
const mockThreadParticipantFindUnique = vi.mocked(prisma.threadParticipant.findUnique)
const mockThreadParticipantCreateMany = vi.mocked(prisma.threadParticipant.createMany)
const mockThreadParticipantFindMany = vi.mocked(prisma.threadParticipant.findMany)
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
  vi.mocked(getIo).mockReturnValue({ to: mockTo } as never)
  mockTo.mockReturnValue({ emit: mockEmit })
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
    mockMessageThreadUpdate.mockResolvedValue(createdThread as never)

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
    expect(mockMessageThreadUpdate).toHaveBeenCalledWith({
      where: { id: threadId },
      data: { lastMessageAt: createdMessage.sentAt },
    })
    expect(mockTo).toHaveBeenCalledWith(`user:${adminId}`)
    expect(mockTo).toHaveBeenCalledWith(`user:${instructorId}`)
    expect(mockEmit).toHaveBeenCalledWith('new-message', { threadId })
    expect(result).toEqual(createdMessage)
  })

  it('reuses an existing DIRECT thread between admin and instructor', async () => {
    mockUserRoleFindFirst.mockResolvedValue({ role: 'INSTRUCTOR' } as never)
    mockMessageThreadFindFirst.mockResolvedValue(createdThread as never)
    mockMessageCreate.mockResolvedValue(createdMessage as never)
    mockMessageThreadUpdate.mockResolvedValue(createdThread as never)

    const result = await createDirectMessage({ adminId, instructorId, body: 'Hello!' })

    expect(mockMessageThreadCreate).not.toHaveBeenCalled()
    expect(mockThreadParticipantCreateMany).not.toHaveBeenCalled()
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId, senderId: adminId, body: 'Hello!' },
    })
    expect(mockMessageThreadUpdate).toHaveBeenCalledWith({
      where: { id: threadId },
      data: { lastMessageAt: createdMessage.sentAt },
    })
    expect(mockTo).toHaveBeenCalledWith(`user:${adminId}`)
    expect(mockTo).toHaveBeenCalledWith(`user:${instructorId}`)
    expect(mockEmit).toHaveBeenCalledWith('new-message', { threadId })
    expect(result).toEqual(createdMessage)
  })
})

describe('getInbox', () => {
  const latestMessage = {
    id: 'message_1',
    threadId: 'thread_1',
    senderId: adminId,
    body: 'Hello there',
    sentAt: new Date('2026-01-10'),
    triggerId: null,
    readAt: null,
  }

  const thread1 = {
    id: 'thread_1',
    type: 'DIRECT' as const,
    classId: null,
    class: null,
    lastMessageAt: new Date('2026-01-10'),
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { userId: adminId, canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
      { userId: instructorId, canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
    ],
    messages: [latestMessage],
  }

  it('returns an empty array when user has no threads', async () => {
    mockMessageThreadFindMany.mockResolvedValue([] as never)

    const result = await getInbox('user_1')

    expect(result).toEqual([])
  })

  it('queries threads ordered by lastMessageAt descending', async () => {
    mockMessageThreadFindMany.mockResolvedValue([] as never)

    await getInbox('user_1')

    expect(mockMessageThreadFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lastMessageAt: 'desc' } })
    )
  })

  it('maps threads to summaries with latest message, participant names, and className', async () => {
    mockMessageThreadFindMany.mockResolvedValue([thread1] as never)

    const result = await getInbox('user_1')

    expect(result).toHaveLength(1)
    expect(result[0]?.threadId).toBe('thread_1')
    expect(result[0]?.type).toBe('DIRECT')
    expect(result[0]?.className).toBeNull()
    expect(result[0]?.latestMessage).toMatchObject({ id: 'message_1', body: 'Hello there', readAt: null })
    expect(result[0]?.participants).toHaveLength(2)
    expect(result[0]?.participants[0]).toMatchObject({ user: { firstName: 'Admin', lastName: 'User' } })
    expect(result[0]?.participants[1]).toMatchObject({ user: { firstName: 'Jane', lastName: 'Smith' } })
  })

  it('returns className from the linked class for ANNOUNCEMENT threads', async () => {
    const announcementThread = {
      ...thread1,
      type: 'ANNOUNCEMENT' as const,
      classId: 'class_1',
      class: { title: 'Yoga Flow Advanced' },
    }
    mockMessageThreadFindMany.mockResolvedValue([announcementThread] as never)

    const result = await getInbox('user_1')

    expect(result[0]?.className).toBe('Yoga Flow Advanced')
  })

  it('returns latestMessage as null when the thread has no messages', async () => {
    mockMessageThreadFindMany.mockResolvedValue([{ ...thread1, messages: [] }] as never)

    const result = await getInbox('user_1')

    expect(result[0]?.latestMessage).toBeNull()
  })
})

describe('getThread', () => {
  const threadWithMessages = {
    id: threadId,
    type: 'DIRECT' as const,
    classId: null,
    class: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    participants: [
      { userId: adminId, canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
      { userId: instructorId, canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
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
    expect(result.className).toBeNull()
    expect(result.messages).toHaveLength(1)
    expect(result.participants).toHaveLength(2)
    expect(result.participants[0]).toMatchObject({ user: { firstName: 'Admin', lastName: 'User' } })
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
    mockMessageThreadUpdate.mockResolvedValue(createdThread as never)
    mockThreadParticipantFindMany.mockResolvedValue([
      { userId: adminId },
      { userId: instructorId },
    ] as never)

    const result = await replyToThread({ threadId, senderId: adminId, body: 'Hello!' })

    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: { threadId, senderId: adminId, body: 'Hello!' },
    })
    expect(mockMessageThreadUpdate).toHaveBeenCalledWith({
      where: { id: threadId },
      data: { lastMessageAt: createdMessage.sentAt },
    })
    expect(mockThreadParticipantFindMany).toHaveBeenCalledWith({
      where: { threadId },
      select: { userId: true },
    })
    expect(mockTo).toHaveBeenCalledWith(`user:${adminId}`)
    expect(mockTo).toHaveBeenCalledWith(`user:${instructorId}`)
    expect(mockEmit).toHaveBeenCalledWith('new-message', { threadId })
    expect(result).toEqual(createdMessage)
  })
})
