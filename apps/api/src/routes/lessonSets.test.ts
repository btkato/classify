import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findMany: vi.fn() },
  },
}))

vi.mock('../services/lessonSetService.js')

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as lessonSetService from '../services/lessonSetService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockCreateLessonSet = vi.mocked(lessonSetService.createLessonSet)
const mockListLessonSets = vi.mocked(lessonSetService.listLessonSets)
const mockGetLessonSet = vi.mocked(lessonSetService.getLessonSet)
const mockUpdateLessonSet = vi.mocked(lessonSetService.updateLessonSet)
const mockCancelLessonSet = vi.mocked(lessonSetService.cancelLessonSet)

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

const lessonSetRecord = {
  id: 'ls_1',
  title: 'Morning Yoga Series',
  description: null,
  enrollmentType: 'FULL_SET',
  totalSessions: 3,
  status: 'ACTIVE',
  instructorId: 'user_1',
  categoryId: 'cat_1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const validBody = {
  title: 'Morning Yoga Series',
  enrollmentType: 'FULL_SET',
  totalSessions: 3,
  categoryId: 'cat_1',
  capacity: 10,
  durationMinutes: 60,
  firstSessionStartsAt: futureDate,
  intervalDays: 7,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'user_1' } as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('POST /lesson-sets', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).post('/lesson-sets').send(validBody)

    expect(response.status).toBe(401)
  })

  it('returns 403 when the user is not an ADMIN', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const response = await request(app)
      .post('/lesson-sets')
      .set('Authorization', 'Bearer token')
      .send(validBody)

    expect(response.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await request(app)
      .post('/lesson-sets')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Incomplete' })

    expect(response.status).toBe(400)
  })

  it('returns 400 when enrollmentType is not a valid enum value', async () => {
    const response = await request(app)
      .post('/lesson-sets')
      .set('Authorization', 'Bearer token')
      .send({ ...validBody, enrollmentType: 'INVALID' })

    expect(response.status).toBe(400)
  })

  it('returns 201 with the created lesson set', async () => {
    mockCreateLessonSet.mockResolvedValue(lessonSetRecord as never)

    const response = await request(app)
      .post('/lesson-sets')
      .set('Authorization', 'Bearer token')
      .send(validBody)

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ id: 'ls_1', title: 'Morning Yoga Series' })
  })

  it('calls createLessonSet with the authenticated userId as instructorId', async () => {
    mockCreateLessonSet.mockResolvedValue(lessonSetRecord as never)

    await request(app)
      .post('/lesson-sets')
      .set('Authorization', 'Bearer token')
      .send(validBody)

    expect(mockCreateLessonSet).toHaveBeenCalledWith(
      expect.objectContaining({ instructorId: 'user_1' })
    )
  })
})

describe('GET /lesson-sets', () => {
  it('returns 200 with all lesson sets', async () => {
    mockListLessonSets.mockResolvedValue([lessonSetRecord] as never)

    const response = await request(app).get('/lesson-sets')

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({ id: 'ls_1' })
  })

  it('is accessible without authentication', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)
    mockListLessonSets.mockResolvedValue([])

    const response = await request(app).get('/lesson-sets')

    expect(response.status).toBe(200)
  })
})

describe('GET /lesson-sets/:id', () => {
  const lessonSetWithClasses = { ...lessonSetRecord, classes: [] }

  it('returns 200 with the lesson set and its sessions', async () => {
    mockGetLessonSet.mockResolvedValue(lessonSetWithClasses as never)

    const response = await request(app).get('/lesson-sets/ls_1')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 'ls_1', classes: [] })
  })

  it('returns 404 when the lesson set does not exist', async () => {
    const { NotFoundError } = await import('../lib/errors.js')
    mockGetLessonSet.mockRejectedValue(new NotFoundError('Lesson set not found'))

    const response = await request(app).get('/lesson-sets/nonexistent')

    expect(response.status).toBe(404)
  })

  it('is accessible without authentication', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)
    mockGetLessonSet.mockResolvedValue(lessonSetWithClasses as never)

    const response = await request(app).get('/lesson-sets/ls_1')

    expect(response.status).toBe(200)
  })
})

describe('PATCH /lesson-sets/:id', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).patch('/lesson-sets/ls_1').send({ title: 'Updated' })

    expect(response.status).toBe(401)
  })

  it('returns 403 when the user is not an ADMIN', async () => {
    mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const response = await request(app)
      .patch('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Updated' })

    expect(response.status).toBe(403)
  })

  it('returns 200 with the updated lesson set', async () => {
    const updated = { ...lessonSetRecord, title: 'Updated' }
    mockUpdateLessonSet.mockResolvedValue(updated as never)

    const response = await request(app)
      .patch('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Updated' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ title: 'Updated' })
  })

  it('calls updateLessonSet with the id and body', async () => {
    mockUpdateLessonSet.mockResolvedValue(lessonSetRecord as never)

    await request(app)
      .patch('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Updated' })

    expect(mockUpdateLessonSet).toHaveBeenCalledWith('ls_1', { title: 'Updated' })
  })
})

describe('DELETE /lesson-sets/:id', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).delete('/lesson-sets/ls_1')

    expect(response.status).toBe(401)
  })

  it('returns 403 when the user is not an ADMIN', async () => {
    mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const response = await request(app)
      .delete('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(403)
  })

  it('returns 200 with the cancelled lesson set', async () => {
    const cancelled = { ...lessonSetRecord, status: 'CANCELLED' }
    mockCancelLessonSet.mockResolvedValue(cancelled as never)

    const response = await request(app)
      .delete('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ status: 'CANCELLED' })
  })

  it('calls deleteLessonSet with the id', async () => {
    mockCancelLessonSet.mockResolvedValue({ ...lessonSetRecord, status: 'CANCELLED' } as never)

    await request(app)
      .delete('/lesson-sets/ls_1')
      .set('Authorization', 'Bearer token')

    expect(mockCancelLessonSet).toHaveBeenCalledWith('ls_1')
  })
})
