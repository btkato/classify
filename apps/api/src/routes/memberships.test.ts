import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { NotFoundError, ForbiddenError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../services/membershipService.js', () => ({
  createMembership: vi.fn(),
  listMemberships: vi.fn(),
  listMembershipHistory: vi.fn(),
  getMembership: vi.fn(),
  cancelMembership: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import * as membershipService from '../services/membershipService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockCreateMembership = vi.mocked(membershipService.createMembership)
const mockListMemberships = vi.mocked(membershipService.listMemberships)
const mockListMembershipHistory = vi.mocked(membershipService.listMembershipHistory)
const mockGetMembership = vi.mocked(membershipService.getMembership)
const mockCancelMembership = vi.mocked(membershipService.cancelMembership)

const baseMembership = {
  id: 'mem_1',
  userId: 'user_1',
  type: 'MONTHLY',
  status: 'ACTIVE',
  priority: 1,
  classesTotal: null,
  classesRemaining: null,
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'user_1' } as never)
})

describe('POST /memberships', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).post('/memberships').send({ type: 'MONTHLY' })

      expect(res.status).toBe(401)
    })
  })

  describe('request validation', () => {
    it('returns 400 when type is missing', async () => {
      const res = await request(app).post('/memberships').send({})

      expect(res.status).toBe(400)
    })

    it('returns 400 when type is not a valid MembershipType', async () => {
      const res = await request(app).post('/memberships').send({ type: 'INVALID' })

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('calls createMembership with userId from auth and type from body, returns 201', async () => {
      mockCreateMembership.mockResolvedValue(baseMembership as never)

      const res = await request(app).post('/memberships').send({ type: 'MONTHLY' })

      expect(res.status).toBe(201)
      expect(mockCreateMembership).toHaveBeenCalledWith('user_1', 'MONTHLY')
      expect(res.body).toMatchObject({ id: 'mem_1', type: 'MONTHLY' })
    })

    it('accepts all valid membership types', async () => {
      const types = ['DROP_IN', 'CLASS_PACK_5', 'CLASS_PACK_10', 'MONTHLY', 'CONTINUOUS_MONTHLY', 'YEARLY']

      for (const type of types) {
        mockCreateMembership.mockResolvedValue({ ...baseMembership, type } as never)

        const res = await request(app).post('/memberships').send({ type })

        expect(res.status).toBe(201)
      }
    })
  })
})

describe('GET /memberships', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/memberships')

      expect(res.status).toBe(401)
    })
  })

  describe('success', () => {
    it('calls listMemberships with userId from auth and returns 200 with the array', async () => {
      mockListMemberships.mockResolvedValue([baseMembership] as never)

      const res = await request(app).get('/memberships')

      expect(res.status).toBe(200)
      expect(mockListMemberships).toHaveBeenCalledWith('user_1')
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ id: 'mem_1' })
    })

    it('returns 200 with an empty array when the user has no memberships', async () => {
      mockListMemberships.mockResolvedValue([])

      const res = await request(app).get('/memberships')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })
})

describe('GET /memberships/:id', () => {
  const membershipWithTransactions = { ...baseMembership, membershipTransactions: [] }

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/memberships/mem_1')

      expect(res.status).toBe(401)
    })
  })

  describe('success', () => {
    it('calls getMembership with id, userId, and isAdmin false, returns 200', async () => {
      mockGetMembership.mockResolvedValue(membershipWithTransactions as never)

      const res = await request(app).get('/memberships/mem_1')

      expect(res.status).toBe(200)
      expect(mockGetMembership).toHaveBeenCalledWith('mem_1', 'user_1', false)
      expect(res.body).toMatchObject({ id: 'mem_1', membershipTransactions: [] })
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockGetMembership.mockRejectedValue(new NotFoundError('Membership not found'))

      const res = await request(app).get('/memberships/mem_1')

      expect(res.status).toBe(404)
      expect(res.body).toMatchObject({ error: { message: 'Membership not found' } })
    })

    it('returns 403 when service throws ForbiddenError', async () => {
      mockGetMembership.mockRejectedValue(new ForbiddenError('You do not have permission to view this membership'))

      const res = await request(app).get('/memberships/mem_1')

      expect(res.status).toBe(403)
      expect(res.body).toMatchObject({ error: { message: 'You do not have permission to view this membership' } })
    })
  })
})

describe('GET /memberships/history', () => {
  const historyPage = {
    data: [baseMembership],
    total: 12,
    page: 1,
    totalPages: 3,
  }

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/memberships/history')

      expect(res.status).toBe(401)
    })
  })

  describe('query param validation', () => {
    it('returns 400 when page is not a positive integer', async () => {
      const res = await request(app).get('/memberships/history?page=0')

      expect(res.status).toBe(400)
    })

    it('returns 400 when limit is not a positive integer', async () => {
      const res = await request(app).get('/memberships/history?limit=0')

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('calls listMembershipHistory with userId, default page 1, default limit 5', async () => {
      mockListMembershipHistory.mockResolvedValue(historyPage as never)

      const res = await request(app).get('/memberships/history')

      expect(res.status).toBe(200)
      expect(mockListMembershipHistory).toHaveBeenCalledWith('user_1', 1, 5)
      expect(res.body).toMatchObject({ total: 12, page: 1, totalPages: 3 })
    })

    it('passes custom page and limit from query params', async () => {
      mockListMembershipHistory.mockResolvedValue({ ...historyPage, page: 2 } as never)

      const res = await request(app).get('/memberships/history?page=2&limit=10')

      expect(res.status).toBe(200)
      expect(mockListMembershipHistory).toHaveBeenCalledWith('user_1', 2, 10)
    })
  })
})

describe('PATCH /memberships/:id/cancel', () => {
  const cancelledMembership = { ...baseMembership, type: 'CONTINUOUS_MONTHLY', status: 'CANCELLED' }

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).patch('/memberships/mem_1/cancel')

      expect(res.status).toBe(401)
    })
  })

  describe('success', () => {
    it('calls cancelMembership with id and userId from auth, returns 200', async () => {
      mockCancelMembership.mockResolvedValue(cancelledMembership as never)

      const res = await request(app).patch('/memberships/mem_1/cancel')

      expect(res.status).toBe(200)
      expect(mockCancelMembership).toHaveBeenCalledWith('mem_1', 'user_1')
      expect(res.body).toMatchObject({ status: 'CANCELLED' })
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockCancelMembership.mockRejectedValue(new NotFoundError('Membership not found'))

      const res = await request(app).patch('/memberships/mem_1/cancel')

      expect(res.status).toBe(404)
    })

    it('returns 403 when service throws ForbiddenError', async () => {
      mockCancelMembership.mockRejectedValue(new ForbiddenError('You do not have permission'))

      const res = await request(app).patch('/memberships/mem_1/cancel')

      expect(res.status).toBe(403)
    })

    it('returns 400 when service throws ValidationError', async () => {
      const { ValidationError } = await import('../lib/errors.js')
      mockCancelMembership.mockRejectedValue(new ValidationError('Only CONTINUOUS_MONTHLY memberships can be self-cancelled'))

      const res = await request(app).patch('/memberships/mem_1/cancel')

      expect(res.status).toBe(400)
    })
  })
})
