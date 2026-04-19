import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../services/classService.js', () => ({
  createClass: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as classService from '../services/classService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockCreateClass = vi.mocked(classService.createClass)

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

const validBody = {
  categoryId: 'cat_1',
  title: 'Morning Yoga',
  capacity: 10,
  startsAt: futureDate,
  durationMinutes: 60,
}

const createdClass = {
  id: 'class_1',
  ...validBody,
  startsAt: new Date(futureDate),
  instructorId: 'user_1',
  status: 'DRAFT',
  description: null,
  location: null,
  recurringGroupId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'user_1' } as never)
  mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)
})

describe('POST /classes', () => {
  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(403)
    })

    it('returns 201 when authenticated as INSTRUCTOR', async () => {
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(201)
    })

    it('returns 201 when authenticated as ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(201)
    })
  })

  describe('request validation', () => {
    it('returns 400 when title is missing', async () => {
      const { title: _, ...body } = validBody

      const res = await request(app).post('/classes').send(body)

      expect(res.status).toBe(400)
    })

    it('returns 400 when categoryId is missing', async () => {
      const { categoryId: _, ...body } = validBody

      const res = await request(app).post('/classes').send(body)

      expect(res.status).toBe(400)
    })

    it('returns 400 when capacity is 0', async () => {
      const res = await request(app).post('/classes').send({ ...validBody, capacity: 0 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when capacity is negative', async () => {
      const res = await request(app).post('/classes').send({ ...validBody, capacity: -1 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when startsAt is missing', async () => {
      const { startsAt: _, ...body } = validBody

      const res = await request(app).post('/classes').send(body)

      expect(res.status).toBe(400)
    })

    it('returns 400 when durationMinutes is missing', async () => {
      const { durationMinutes: _, ...body } = validBody

      const res = await request(app).post('/classes').send(body)

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('calls createClass with instructorId from auth and returns 201 with the created class', async () => {
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(201)
      expect(mockCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({
          instructorId: 'user_1',
          categoryId: 'cat_1',
          title: 'Morning Yoga',
          capacity: 10,
          durationMinutes: 60,
        })
      )
      expect(res.body).toMatchObject({ id: 'class_1', title: 'Morning Yoga' })
    })
  })

  describe('error handling', () => {
    it('returns 400 when service throws a ValidationError', async () => {
      mockCreateClass.mockRejectedValue(new ValidationError('Class must start in the future'))

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: { message: 'Class must start in the future' } })
    })
  })
})
