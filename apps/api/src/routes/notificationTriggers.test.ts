import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from 'db'
import { NotFoundError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findMany: vi.fn() },
  },
}))

vi.mock('../services/notificationTriggerService.js', () => ({
  listNotificationTriggers: vi.fn(),
  createNotificationTrigger: vi.fn(),
  updateNotificationTrigger: vi.fn(),
  deleteNotificationTrigger: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as notificationTriggerService from '../services/notificationTriggerService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockList = vi.mocked(notificationTriggerService.listNotificationTriggers)
const mockCreate = vi.mocked(notificationTriggerService.createNotificationTrigger)
const mockUpdate = vi.mocked(notificationTriggerService.updateNotificationTrigger)
const mockDelete = vi.mocked(notificationTriggerService.deleteNotificationTrigger)

const adminAuth = { userId: 'admin_1' }

const baseTrigger = {
  id: 'trigger_1',
  createdByUserId: 'admin_1',
  name: 'Expiring soon',
  triggerEvent: 'MEMBERSHIP_EXPIRING',
  offsetDays: -7,
  messageTemplate: 'Hi {student}, your membership expires in {days} days.',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGetAuth.mockReturnValue(adminAuth as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('GET /notification-triggers', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).get('/notification-triggers')

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as STUDENT', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const res = await request(app).get('/notification-triggers')

    expect(res.status).toBe(403)
  })

  it('returns 200 with list of triggers', async () => {
    mockList.mockResolvedValue([baseTrigger] as never)

    const res = await request(app).get('/notification-triggers')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Expiring soon')
    expect(mockList).toHaveBeenCalledOnce()
  })
})

describe('POST /notification-triggers', () => {
  const validBody = {
    name: 'Expiring soon',
    triggerEvent: 'MEMBERSHIP_EXPIRING',
    offsetDays: -7,
    messageTemplate: 'Hi {student}, your membership expires in {days} days.',
  }

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).post('/notification-triggers').send(validBody)

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as STUDENT', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const res = await request(app).post('/notification-triggers').send(validBody)

    expect(res.status).toBe(403)
  })

  it('returns 400 when triggerEvent is not a valid enum value', async () => {
    const res = await request(app)
      .post('/notification-triggers')
      .send({ ...validBody, triggerEvent: 'INVALID_EVENT' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/notification-triggers')
      .send({ name: 'Expiring soon' })

    expect(res.status).toBe(400)
  })

  it('returns 201 with created trigger and sets createdByUserId from auth', async () => {
    mockCreate.mockResolvedValue(baseTrigger as never)

    const res = await request(app).post('/notification-triggers').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Expiring soon')
    expect(mockCreate).toHaveBeenCalledWith({
      ...validBody,
      createdByUserId: adminAuth.userId,
    })
  })
})

describe('PATCH /notification-triggers/:id', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app)
      .patch('/notification-triggers/trigger_1')
      .send({ isActive: false })

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as STUDENT', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const res = await request(app)
      .patch('/notification-triggers/trigger_1')
      .send({ isActive: false })

    expect(res.status).toBe(403)
  })

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .patch('/notification-triggers/trigger_1')
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when triggerEvent is invalid', async () => {
    const res = await request(app)
      .patch('/notification-triggers/trigger_1')
      .send({ triggerEvent: 'NOT_REAL' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when trigger does not exist', async () => {
    mockUpdate.mockRejectedValue(new NotFoundError('Trigger not found'))

    const res = await request(app)
      .patch('/notification-triggers/nonexistent')
      .send({ isActive: false })

    expect(res.status).toBe(404)
  })

  it('returns 200 with updated trigger', async () => {
    const updated = { ...baseTrigger, isActive: false }
    mockUpdate.mockResolvedValue(updated as never)

    const res = await request(app)
      .patch('/notification-triggers/trigger_1')
      .send({ isActive: false })

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)
    expect(mockUpdate).toHaveBeenCalledWith('trigger_1', { isActive: false })
  })
})

describe('DELETE /notification-triggers/:id', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).delete('/notification-triggers/trigger_1')

    expect(res.status).toBe(401)
  })

  it('returns 403 when authenticated as STUDENT', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const res = await request(app).delete('/notification-triggers/trigger_1')

    expect(res.status).toBe(403)
  })

  it('returns 404 when trigger does not exist', async () => {
    mockDelete.mockRejectedValue(new NotFoundError('Trigger not found'))

    const res = await request(app).delete('/notification-triggers/nonexistent')

    expect(res.status).toBe(404)
  })

  it('returns 409 when trigger has associated notification jobs', async () => {
    mockDelete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: '5.0.0',
      })
    )

    const res = await request(app).delete('/notification-triggers/trigger_1')

    expect(res.status).toBe(409)
  })

  it('returns 204 with no body on success', async () => {
    mockDelete.mockResolvedValue(baseTrigger as never)

    const res = await request(app).delete('/notification-triggers/trigger_1')

    expect(res.status).toBe(204)
    expect(res.body).toEqual({})
    expect(mockDelete).toHaveBeenCalledWith('trigger_1')
  })
})
