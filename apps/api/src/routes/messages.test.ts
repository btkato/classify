import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { NotFoundError, ForbiddenError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findMany: vi.fn() },
  },
}))

vi.mock('../services/messageService.js', () => ({
  createDirectMessage: vi.fn(),
  getInbox: vi.fn(),
  getThread: vi.fn(),
  replyToThread: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as messageService from '../services/messageService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockUserRoleFindMany = vi.mocked(prisma.userRole.findMany)
const mockCreateDirectMessage = vi.mocked(messageService.createDirectMessage)
const mockGetInbox = vi.mocked(messageService.getInbox)
const mockGetThread = vi.mocked(messageService.getThread)
const mockReplyToThread = vi.mocked(messageService.replyToThread)

const adminAuth = { userId: 'user_admin_1' }
const instructorAuth = { userId: 'user_instructor_1' }

const createdMessage = {
  id: 'message_1',
  threadId: 'thread_1',
  senderId: 'user_admin_1',
  body: 'Hello!',
  triggerId: null,
  readAt: null,
  sentAt: new Date().toISOString(),
}

const threadDetail = {
  threadId: 'thread_1',
  type: 'DIRECT',
  classId: null,
  participants: [
    { userId: 'user_admin_1', canReply: true },
    { userId: 'user_instructor_1', canReply: true },
  ],
  messages: [createdMessage],
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app)
      .post('/messages')
      .send({ instructorId: 'user_instructor_1', body: 'Hello!' })

    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not have ADMIN role', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const res = await request(app)
      .post('/messages')
      .send({ instructorId: 'user_instructor_1', body: 'Hello!' })

    expect(res.status).toBe(403)
  })

  it('returns 400 when body is missing required fields', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)

    const res = await request(app).post('/messages').send({ body: 'Hello!' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when instructor is not found', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
    mockCreateDirectMessage.mockRejectedValue(new NotFoundError('Instructor not found'))

    const res = await request(app)
      .post('/messages')
      .send({ instructorId: 'user_instructor_1', body: 'Hello!' })

    expect(res.status).toBe(404)
  })

  it('returns 201 with the created message on success', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
    mockCreateDirectMessage.mockResolvedValue(createdMessage as never)

    const res = await request(app)
      .post('/messages')
      .send({ instructorId: 'user_instructor_1', body: 'Hello!' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(createdMessage)
    expect(mockCreateDirectMessage).toHaveBeenCalledWith({
      adminId: adminAuth.userId,
      instructorId: 'user_instructor_1',
      body: 'Hello!',
    })
  })
})

describe('GET /messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).get('/messages')

    expect(res.status).toBe(401)
  })

  it('returns 200 with the inbox on success', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockGetInbox.mockResolvedValue([threadDetail] as never)

    const res = await request(app).get('/messages')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(mockGetInbox).toHaveBeenCalledWith(adminAuth.userId)
  })
})

describe('GET /messages/:threadId', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).get('/messages/thread_1')

    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a participant', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockGetThread.mockRejectedValue(new ForbiddenError('You are not a participant in this thread'))

    const res = await request(app).get('/messages/thread_1')

    expect(res.status).toBe(403)
  })

  it('returns 200 with thread detail on success', async () => {
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockGetThread.mockResolvedValue(threadDetail as never)

    const res = await request(app).get('/messages/thread_1')

    expect(res.status).toBe(200)
    expect(res.body.threadId).toBe('thread_1')
    expect(mockGetThread).toHaveBeenCalledWith(adminAuth.userId, 'thread_1')
  })
})

describe('POST /messages/:threadId/reply', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app)
      .post('/messages/thread_1/reply')
      .send({ body: 'Reply!' })

    expect(res.status).toBe(401)
  })

  it('returns 403 when participant cannot reply', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockReplyToThread.mockRejectedValue(
      new ForbiddenError('You do not have permission to reply in this thread')
    )

    const res = await request(app)
      .post('/messages/thread_1/reply')
      .send({ body: 'Reply!' })

    expect(res.status).toBe(403)
  })

  it('returns 400 when body is missing', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)

    const res = await request(app).post('/messages/thread_1/reply').send({})

    expect(res.status).toBe(400)
  })

  it('returns 201 with the reply message on success', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockReplyToThread.mockResolvedValue(createdMessage as never)

    const res = await request(app)
      .post('/messages/thread_1/reply')
      .send({ body: 'Reply!' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual(createdMessage)
    expect(mockReplyToThread).toHaveBeenCalledWith({
      threadId: 'thread_1',
      senderId: instructorAuth.userId,
      body: 'Reply!',
    })
  })
})
