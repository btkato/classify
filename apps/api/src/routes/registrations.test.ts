import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from 'db'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../services/registrationService.js')

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import * as registrationService from '../services/registrationService.js'

const mockGetAuth = vi.mocked(getAuth)

const mockEnrollStudent = vi.mocked(registrationService.enrollStudent)
const mockCancelRegistration = vi.mocked(registrationService.cancelRegistration)
const mockListRegistrations = vi.mocked(registrationService.listRegistrations)

const baseRegistration = {
  id: 'reg_1',
  userId: 'user_1',
  classId: 'class_1',
  membershipId: null,
  status: 'ENROLLED',
  waitlistPosition: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'user_1' } as never)
})

describe('POST /registrations', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).post('/registrations').send({ classId: 'class_1' })

    expect(response.status).toBe(401)
  })

  it('returns 400 when classId is missing', async () => {
    const response = await request(app)
      .post('/registrations')
      .set('Authorization', 'Bearer token')
      .send({})

    expect(response.status).toBe(400)
  })

  it('returns 201 with the created registration', async () => {
    mockEnrollStudent.mockResolvedValue(baseRegistration as never)

    const response = await request(app)
      .post('/registrations')
      .set('Authorization', 'Bearer token')
      .send({ classId: 'class_1' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ id: 'reg_1', status: 'ENROLLED' })
  })

  it('returns 409 when concurrent enrollment hits the unique constraint (race condition)', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on registrations', {
      code: 'P2002',
      clientVersion: '7.7.0',
    })
    mockEnrollStudent.mockRejectedValue(error)

    const response = await request(app)
      .post('/registrations')
      .set('Authorization', 'Bearer token')
      .send({ classId: 'class_1' })

    expect(response.status).toBe(409)
  })

  it('calls enrollStudent with the authenticated userId and the provided classId', async () => {
    mockEnrollStudent.mockResolvedValue(baseRegistration as never)

    await request(app)
      .post('/registrations')
      .set('Authorization', 'Bearer token')
      .send({ classId: 'class_1' })

    expect(mockEnrollStudent).toHaveBeenCalledWith('user_1', 'class_1')
  })
})

describe('DELETE /registrations/:id', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).delete('/registrations/reg_1')

    expect(response.status).toBe(401)
  })

  it('returns 200 with the cancelled registration', async () => {
    mockCancelRegistration.mockResolvedValue({
      ...baseRegistration,
      status: 'CANCELLED',
    } as never)

    const response = await request(app)
      .delete('/registrations/reg_1')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 'reg_1', status: 'CANCELLED' })
  })

  it('calls cancelRegistration with the registration id and authenticated userId', async () => {
    mockCancelRegistration.mockResolvedValue({
      ...baseRegistration,
      status: 'CANCELLED',
    } as never)

    await request(app)
      .delete('/registrations/reg_1')
      .set('Authorization', 'Bearer token')

    expect(mockCancelRegistration).toHaveBeenCalledWith('reg_1', 'user_1')
  })
})

describe('GET /registrations', () => {
  const registrationWithClass = {
    ...baseRegistration,
    class: {
      id: 'class_1',
      title: 'Morning Yoga',
      startsAt: new Date('2026-05-01T08:00:00.000Z').toISOString(),
      durationMinutes: 60,
      location: 'Studio A',
      status: 'ACTIVE',
    },
  }

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const response = await request(app).get('/registrations')

    expect(response.status).toBe(401)
  })

  it('returns 200 with the list of registrations', async () => {
    mockListRegistrations.mockResolvedValue([registrationWithClass] as never)

    const response = await request(app)
      .get('/registrations')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({ id: 'reg_1', status: 'ENROLLED' })
  })

  it('calls listRegistrations with the authenticated userId', async () => {
    mockListRegistrations.mockResolvedValue([registrationWithClass] as never)

    await request(app).get('/registrations').set('Authorization', 'Bearer token')

    expect(mockListRegistrations).toHaveBeenCalledWith('user_1')
  })
})
