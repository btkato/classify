import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors.js'

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
  listClasses: vi.fn(),
  getClass: vi.fn(),
  updateClass: vi.fn(),
  cancelClass: vi.fn(),
  getRoster: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as classService from '../services/classService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockCreateClass = vi.mocked(classService.createClass)
const mockListClasses = vi.mocked(classService.listClasses)
const mockGetClass = vi.mocked(classService.getClass)
const mockUpdateClass = vi.mocked(classService.updateClass)
const mockCancelClass = vi.mocked(classService.cancelClass)
const mockGetRoster = vi.mocked(classService.getRoster)

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
  lessonSetId: null,
  sessionNumber: null,
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

    it('returns 403 when authenticated as INSTRUCTOR', async () => {
      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(403)
    })

    it('returns 201 when authenticated as ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(201)
    })
  })

  describe('request validation', () => {
    beforeEach(() => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
    })

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
    it('calls createClass with instructorId from auth when none provided in body', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(201)
      expect(mockCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({ instructorId: 'user_1' })
      )
      expect(res.body).toMatchObject({ id: 'class_1', title: 'Morning Yoga' })
    })

    it('uses instructorId from body when provided', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCreateClass.mockResolvedValue(createdClass as never)

      const res = await request(app)
        .post('/classes')
        .send({ ...validBody, instructorId: 'instructor_99' })

      expect(res.status).toBe(201)
      expect(mockCreateClass).toHaveBeenCalledWith(
        expect.objectContaining({ instructorId: 'instructor_99' })
      )
    })
  })

  describe('error handling', () => {
    it('returns 400 when service throws a ValidationError', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCreateClass.mockRejectedValue(new ValidationError('Class must start in the future'))

      const res = await request(app).post('/classes').send(validBody)

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: { message: 'Class must start in the future' } })
    })
  })
})

describe('GET /classes', () => {
  const pageResult = { data: [createdClass], total: 1, page: 1, totalPages: 1 }
  const emptyPageResult = { data: [], total: 0, page: 1, totalPages: 0 }

  it('returns 200 with a paginated result', async () => {
    mockListClasses.mockResolvedValue(pageResult as never)

    const res = await request(app).get('/classes')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ id: 'class_1', title: 'Morning Yoga' })
    expect(res.body.total).toBe(1)
    expect(res.body.page).toBe(1)
    expect(res.body.totalPages).toBe(1)
  })

  it('returns 200 with empty data when no classes exist', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    const res = await request(app).get('/classes')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('passes categoryId query param to the service', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    await request(app).get('/classes?categoryId=cat_1')

    expect(mockListClasses).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat_1' })
    )
  })

  it('passes instructorId query param to the service', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    await request(app).get('/classes?instructorId=user_1')

    expect(mockListClasses).toHaveBeenCalledWith(
      expect.objectContaining({ instructorId: 'user_1' })
    )
  })

  it('passes status query param to the service', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    await request(app).get('/classes?status=COMPLETED')

    expect(mockListClasses).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'COMPLETED' })
    )
  })

  it('passes page and pageSize query params to the service', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    await request(app).get('/classes?page=2&pageSize=5')

    expect(mockListClasses).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 5 })
    )
  })

  it('passes from and to query params as dates to the service', async () => {
    mockListClasses.mockResolvedValue(emptyPageResult as never)
    const from = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

    await request(app).get(`/classes?from=${from}&to=${to}`)

    expect(mockListClasses).toHaveBeenCalledWith(
      expect.objectContaining({ from: new Date(from), to: new Date(to) })
    )
  })

  it('does not require authentication', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)
    mockListClasses.mockResolvedValue(emptyPageResult as never)

    const res = await request(app).get('/classes')

    expect(res.status).toBe(200)
  })

  it('returns 400 when from is after to', async () => {
    const from = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()

    const res = await request(app).get(`/classes?from=${from}&to=${to}`)

    expect(res.status).toBe(400)
  })
})

describe('GET /classes/:id', () => {
  it('returns 200 with the class when found', async () => {
    mockGetClass.mockResolvedValue(createdClass as never)

    const res = await request(app).get('/classes/class_1')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'class_1', title: 'Morning Yoga' })
  })

  it('returns 404 when the class does not exist', async () => {
    mockGetClass.mockRejectedValue(new NotFoundError('Class not found'))

    const res = await request(app).get('/classes/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({ error: { message: 'Class not found' } })
  })

  it('does not require authentication', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)
    mockGetClass.mockResolvedValue(createdClass as never)

    const res = await request(app).get('/classes/class_1')

    expect(res.status).toBe(200)
  })
})

describe('PATCH /classes/:id', () => {
  const validPatchBody = { title: 'Evening Yoga' }

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(403)
    })

    it('returns 200 when authenticated as INSTRUCTOR', async () => {
      mockUpdateClass.mockResolvedValue({ ...createdClass, title: 'Evening Yoga' } as never)

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(200)
    })

    it('returns 200 when authenticated as ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockUpdateClass.mockResolvedValue({ ...createdClass, title: 'Evening Yoga' } as never)

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(200)
    })
  })

  describe('isAdmin flag', () => {
    it('calls updateClass with isAdmin false when user is INSTRUCTOR', async () => {
      mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)
      mockUpdateClass.mockResolvedValue(createdClass as never)

      await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(mockUpdateClass).toHaveBeenCalledWith(
        'class_1',
        expect.any(Object),
        'user_1',
        false
      )
    })

    it('calls updateClass with isAdmin true when user is ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockUpdateClass.mockResolvedValue(createdClass as never)

      await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(mockUpdateClass).toHaveBeenCalledWith(
        'class_1',
        expect.any(Object),
        'user_1',
        true
      )
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockUpdateClass.mockRejectedValue(new NotFoundError('Class not found'))

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(404)
      expect(res.body).toMatchObject({ error: { message: 'Class not found' } })
    })

    it('returns 403 when service throws ForbiddenError', async () => {
      mockUpdateClass.mockRejectedValue(new ForbiddenError('You do not have permission to update this class'))

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(403)
      expect(res.body).toMatchObject({ error: { message: 'You do not have permission to update this class' } })
    })

    it('returns 400 when service throws ValidationError', async () => {
      mockUpdateClass.mockRejectedValue(new ValidationError('Class must start in the future'))

      const res = await request(app).patch('/classes/class_1').send(validPatchBody)

      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: { message: 'Class must start in the future' } })
    })
  })
})

describe('DELETE /classes/:id', () => {
  const cancelledClass = { ...createdClass, status: 'CANCELLED' }

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).delete('/classes/class_1')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as INSTRUCTOR', async () => {
      mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

      const res = await request(app).delete('/classes/class_1')

      expect(res.status).toBe(403)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).delete('/classes/class_1')

      expect(res.status).toBe(403)
    })

    it('returns 200 when authenticated as ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCancelClass.mockResolvedValue(cancelledClass as never)

      const res = await request(app).delete('/classes/class_1')

      expect(res.status).toBe(200)
    })
  })

  describe('success', () => {
    it('calls cancelClass with the id and returns the cancelled class', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCancelClass.mockResolvedValue(cancelledClass as never)

      const res = await request(app).delete('/classes/class_1')

      expect(mockCancelClass).toHaveBeenCalledWith('class_1')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: 'class_1', status: 'CANCELLED' })
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockCancelClass.mockRejectedValue(new NotFoundError('Class not found'))

      const res = await request(app).delete('/classes/class_1')

      expect(res.status).toBe(404)
    })
  })
})

describe('GET /classes/:id/roster', () => {
  const roster = [
    {
      id: 'reg_1',
      userId: 'user_2',
      classId: 'class_1',
      membershipId: null,
      status: 'ENROLLED',
      waitlistPosition: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'user_2',
        email: 'student@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      },
    },
  ]

  it('is not shadowed by GET /:id — roster path routes to the correct handler', async () => {
    mockGetRoster.mockResolvedValue(roster as never)

    await request(app).get('/classes/class_1/roster')

    expect(mockGetRoster).toHaveBeenCalled()
    expect(mockGetClass).not.toHaveBeenCalled()
  })

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(403)
    })

    it('returns 200 when authenticated as INSTRUCTOR', async () => {
      mockGetRoster.mockResolvedValue(roster as never)

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(200)
    })

    it('returns 200 when authenticated as ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockGetRoster.mockResolvedValue(roster as never)

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(200)
    })
  })

  describe('success', () => {
    it('calls getRoster with classId, userId, and isAdmin and returns the roster', async () => {
      mockGetRoster.mockResolvedValue(roster as never)

      const res = await request(app).get('/classes/class_1/roster')

      expect(mockGetRoster).toHaveBeenCalledWith('class_1', 'user_1', false)
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ id: 'reg_1', status: 'ENROLLED' })
    })

    it('calls getRoster with isAdmin true when user is ADMIN', async () => {
      mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
      mockGetRoster.mockResolvedValue(roster as never)

      await request(app).get('/classes/class_1/roster')

      expect(mockGetRoster).toHaveBeenCalledWith('class_1', 'user_1', true)
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockGetRoster.mockRejectedValue(new NotFoundError('Class not found'))

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(404)
    })

    it('returns 403 when service throws ForbiddenError', async () => {
      mockGetRoster.mockRejectedValue(new ForbiddenError('You do not have permission to view this roster'))

      const res = await request(app).get('/classes/class_1/roster')

      expect(res.status).toBe(403)
    })
  })
})
