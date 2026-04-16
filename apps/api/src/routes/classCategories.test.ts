import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from 'db'

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

vi.mock('../services/classCategoryService.js', () => ({
  createCategory: vi.fn(),
  listCategories: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as classCategoryService from '../services/classCategoryService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockCreateCategory = vi.mocked(classCategoryService.createCategory)
const mockListCategories = vi.mocked(classCategoryService.listCategories)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'admin_123' } as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('POST /class-categories', () => {
  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app)
        .post('/class-categories')
        .send({ name: 'Yoga' })

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app)
        .post('/class-categories')
        .send({ name: 'Yoga' })

      expect(res.status).toBe(403)
    })

    it('returns 403 when authenticated as INSTRUCTOR', async () => {
      mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

      const res = await request(app)
        .post('/class-categories')
        .send({ name: 'Yoga' })

      expect(res.status).toBe(403)
    })
  })

  describe('request validation', () => {
    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/class-categories')
        .send({})

      expect(res.status).toBe(400)
    })

    it('returns 400 when name is an empty string', async () => {
      const res = await request(app)
        .post('/class-categories')
        .send({ name: '' })

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('returns 201 with the created category', async () => {
      const category = { id: 'cat_1', name: 'Yoga', createdAt: new Date() }
      mockCreateCategory.mockResolvedValue(category)

      const res = await request(app)
        .post('/class-categories')
        .send({ name: 'Yoga' })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ id: 'cat_1', name: 'Yoga' })
      expect(mockCreateCategory).toHaveBeenCalledWith('Yoga')
    })
  })

  describe('error handling', () => {
    it('returns 409 when the category name already exists', async () => {
      mockCreateCategory.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.7.0',
        })
      )

      const res = await request(app)
        .post('/class-categories')
        .send({ name: 'Yoga' })

      expect(res.status).toBe(409)
    })
  })
})

describe('GET /class-categories', () => {
  it('returns 200 with an array of categories', async () => {
    const categories = [
      { id: 'cat_1', name: 'Pilates', createdAt: new Date() },
      { id: 'cat_2', name: 'Yoga', createdAt: new Date() },
    ]
    mockListCategories.mockResolvedValue(categories)

    const res = await request(app).get('/class-categories')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ name: 'Pilates' })
    expect(res.body[1]).toMatchObject({ name: 'Yoga' })
  })

  it('returns 200 with an empty array when no categories exist', async () => {
    mockListCategories.mockResolvedValue([])

    const res = await request(app).get('/class-categories')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})
