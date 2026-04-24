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

vi.mock('../services/announcementService.js', () => ({
  sendAnnouncement: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as announcementService from '../services/announcementService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockUserRoleFindMany = vi.mocked(prisma.userRole.findMany)
const mockSendAnnouncement = vi.mocked(announcementService.sendAnnouncement)

const instructorAuth = { userId: 'user_instructor_1' }

const createdMessage = {
  id: 'message_1',
  threadId: 'thread_1',
  senderId: 'user_instructor_1',
  body: 'Class moved to Studio B.',
  triggerId: null,
  readAt: null,
  sentAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /announcements', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Hello' })

    expect(response.status).toBe(401)
  })

  it('returns 403 when user does not have INSTRUCTOR role', async () => {
    mockGetAuth.mockReturnValue({ userId: 'user_1' } as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Hello' })

    expect(response.status).toBe(403)
  })

  it('returns 400 when body is missing required fields', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1' })

    expect(response.status).toBe(400)
  })

  it('returns 404 when class does not exist', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)
    mockSendAnnouncement.mockRejectedValue(new NotFoundError('Class not found'))

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Hello' })

    expect(response.status).toBe(404)
  })

  it('returns 403 when instructor is not assigned to the class', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)
    mockSendAnnouncement.mockRejectedValue(new ForbiddenError('You are not assigned to this class'))

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Hello' })

    expect(response.status).toBe(403)
  })

  it('returns 201 with the created message on success for an instructor', async () => {
    mockGetAuth.mockReturnValue(instructorAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)
    mockSendAnnouncement.mockResolvedValue(createdMessage as never)

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Class moved to Studio B.' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(createdMessage)
    expect(mockSendAnnouncement).toHaveBeenCalledWith({
      classId: 'class_1',
      senderId: instructorAuth.userId,
      body: 'Class moved to Studio B.',
      isAdmin: false,
    })
  })

  it('returns 201 and passes isAdmin true when sender is an admin', async () => {
    const adminAuth = { userId: 'user_admin_1' }
    mockGetAuth.mockReturnValue(adminAuth as never)
    mockUserRoleFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
    mockSendAnnouncement.mockResolvedValue(createdMessage as never)

    const response = await request(app)
      .post('/announcements')
      .send({ classId: 'class_1', body: 'Class moved to Studio B.' })

    expect(response.status).toBe(201)
    expect(mockSendAnnouncement).toHaveBeenCalledWith({
      classId: 'class_1',
      senderId: adminAuth.userId,
      body: 'Class moved to Studio B.',
      isAdmin: true,
    })
  })
})
