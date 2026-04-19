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
  getMembership: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import * as membershipService from '../services/membershipService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockCreateMembership = vi.mocked(membershipService.createMembership)
const mockListMemberships = vi.mocked(membershipService.listMemberships)
const mockGetMembership = vi.mocked(membershipService.getMembership)

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
