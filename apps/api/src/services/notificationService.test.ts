import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { interpolateTemplate, processNotificationJobs } from './notificationService.js'

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
    notificationJob: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    messageThread: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    threadParticipant: {
      createMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockJobFindMany = vi.mocked(prisma.notificationJob.findMany)
const mockJobFindUnique = vi.mocked(prisma.notificationJob.findUnique)
const mockJobUpdate = vi.mocked(prisma.notificationJob.update)
const mockThreadFindFirst = vi.mocked(prisma.messageThread.findFirst)
const mockThreadCreate = vi.mocked(prisma.messageThread.create)
const mockThreadUpdate = vi.mocked(prisma.messageThread.update)
const mockParticipantCreateMany = vi.mocked(prisma.threadParticipant.createMany)
const mockMessageCreate = vi.mocked(prisma.message.create)
const mockTransaction = vi.mocked(prisma.$transaction)

const baseJob = {
  id: 'job_1',
  userId: 'student_1',
  membershipId: 'mem_1',
  triggerId: 'trigger_1',
  status: 'PENDING' as const,
  triggerAt: new Date('2026-01-01T00:00:00.000Z'),
  sentAt: null,
  createdAt: new Date(),
  user: { id: 'student_1', firstName: 'Frank', lastName: 'Student', email: 'frank@example.com' },
  membership: { id: 'mem_1', classesRemaining: 3, expiresAt: null },
  trigger: {
    id: 'trigger_1',
    createdByUserId: 'admin_1',
    name: 'Welcome message',
    triggerEvent: 'AFTER_PURCHASE' as const,
    offsetDays: 0,
    messageTemplate: 'Hi {student}, welcome to {studio}!',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
  mockJobFindUnique.mockResolvedValue({ status: 'PENDING' } as never)
  mockThreadFindFirst.mockResolvedValue(null)
  mockThreadCreate.mockResolvedValue({ id: 'thread_1' } as never)
  mockParticipantCreateMany.mockResolvedValue({ count: 2 } as never)
  mockMessageCreate.mockResolvedValue({ id: 'msg_1', sentAt: new Date() } as never)
  mockThreadUpdate.mockResolvedValue({} as never)
  mockJobUpdate.mockResolvedValue({} as never)
})

describe('interpolateTemplate', () => {
  it('replaces a single placeholder', () => {
    expect(interpolateTemplate('Hi {student}!', { student: 'Frank' })).toBe('Hi Frank!')
  })

  it('replaces multiple placeholders', () => {
    expect(
      interpolateTemplate('Hi {student}, welcome to {studio}!', { student: 'Frank', studio: 'Classify' })
    ).toBe('Hi Frank, welcome to Classify!')
  })

  it('leaves unknown placeholders unchanged', () => {
    expect(interpolateTemplate('See you in {days} days!', { student: 'Frank' })).toBe(
      'See you in {days} days!'
    )
  })

  it('returns the template unchanged when context is empty', () => {
    expect(interpolateTemplate('Hi {student}!', {})).toBe('Hi {student}!')
  })
})

describe('processNotificationJobs', () => {
  it('does nothing when there are no pending jobs', async () => {
    mockJobFindMany.mockResolvedValue([])

    await processNotificationJobs()

    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockJobUpdate).not.toHaveBeenCalled()
  })

  it('creates a new thread and message for a pending job with no existing thread', async () => {
    mockJobFindMany.mockResolvedValue([baseJob] as never)

    await processNotificationJobs()

    expect(mockThreadCreate).toHaveBeenCalledWith({ data: { type: 'DIRECT' } })
    expect(mockParticipantCreateMany).toHaveBeenCalledWith({
      data: [
        { threadId: 'thread_1', userId: 'admin_1', canReply: true },
        { threadId: 'thread_1', userId: 'student_1', canReply: true },
      ],
    })
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        threadId: 'thread_1',
        senderId: 'admin_1',
        body: 'Hi Frank, welcome to Classify!',
        triggerId: 'trigger_1',
      }),
    })
    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: { status: 'SENT', sentAt: expect.any(Date) },
    })
  })

  it('reuses an existing DIRECT thread between the same admin and student', async () => {
    mockJobFindMany.mockResolvedValue([baseJob] as never)
    mockThreadFindFirst.mockResolvedValue({ id: 'existing_thread' } as never)

    await processNotificationJobs()

    expect(mockThreadCreate).not.toHaveBeenCalled()
    expect(mockMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ threadId: 'existing_thread' }),
    })
  })

  it('emits new-message to both sender and recipient after the transaction', async () => {
    mockJobFindMany.mockResolvedValue([baseJob] as never)

    await processNotificationJobs()

    expect(mockTo).toHaveBeenCalledWith('user:admin_1')
    expect(mockTo).toHaveBeenCalledWith('user:student_1')
    expect(mockEmit).toHaveBeenCalledWith('new-message', { threadId: 'thread_1' })
  })

  it('skips message creation when the job is no longer PENDING inside the transaction', async () => {
    mockJobFindMany.mockResolvedValue([baseJob] as never)
    mockJobFindUnique.mockResolvedValue({ status: 'SENT' } as never)

    await processNotificationJobs()

    expect(mockMessageCreate).not.toHaveBeenCalled()
    expect(mockJobUpdate).not.toHaveBeenCalled()
    expect(mockTo).not.toHaveBeenCalled()
  })

  it('marks a job FAILED and continues processing remaining jobs when one throws', async () => {
    const secondJob = { ...baseJob, id: 'job_2', userId: 'student_2' }
    mockJobFindMany.mockResolvedValue([baseJob, secondJob] as never)
    mockTransaction.mockRejectedValueOnce(new Error('DB error'))

    await processNotificationJobs()

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: { status: 'FAILED' },
    })
    expect(mockMessageCreate).toHaveBeenCalledTimes(1)
  })
})
