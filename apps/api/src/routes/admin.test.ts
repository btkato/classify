import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'

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

vi.mock('../services/roleService.js', () => ({
  grantRole: vi.fn(),
  revokeRole: vi.fn(),
}))

vi.mock('../services/membershipService.js', () => ({
  updateMembership: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as roleService from '../services/roleService.js'
import * as membershipService from '../services/membershipService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockGrantRole = vi.mocked(roleService.grantRole)
const mockRevokeRole = vi.mocked(roleService.revokeRole)
const mockUpdateMembership = vi.mocked(membershipService.updateMembership)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'admin_123' } as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('PATCH /admin/users/:id/roles', () => {
  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'grant' })

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'grant' })

      expect(res.status).toBe(403)
    })

    it('returns 403 when authenticated as INSTRUCTOR', async () => {
      mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'grant' })

      expect(res.status).toBe(403)
    })
  })

  describe('request validation', () => {
    it('returns 400 when action is invalid', async () => {
      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'promote' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when role is invalid', async () => {
      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'SUPERADMIN', action: 'grant' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when body is missing required fields', async () => {
      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  describe('granting and revoking roles', () => {
    it('returns 200 and calls grantRole when action is grant', async () => {
      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'grant' })

      expect(res.status).toBe(200)
      expect(mockGrantRole).toHaveBeenCalledWith('user_123', 'INSTRUCTOR')
      expect(mockRevokeRole).not.toHaveBeenCalled()
    })

    it('returns 200 and calls revokeRole when action is revoke', async () => {
      const res = await request(app)
        .patch('/admin/users/user_123/roles')
        .send({ role: 'INSTRUCTOR', action: 'revoke' })

      expect(res.status).toBe(200)
      expect(mockRevokeRole).toHaveBeenCalledWith('user_123', 'INSTRUCTOR')
      expect(mockGrantRole).not.toHaveBeenCalled()
    })
  })
})

describe('PATCH /admin/memberships/:id', () => {
  const updatedMembership = {
    id: 'mem_1',
    userId: 'user_1',
    type: 'CLASS_PACK_10',
    status: 'PAUSED',
    priority: 2,
    classesTotal: 10,
    classesRemaining: 5,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockUpdateMembership.mockResolvedValue(updatedMembership as never)
  })

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'PAUSED' })

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'PAUSED' })

      expect(res.status).toBe(403)
    })
  })

  describe('request validation', () => {
    it('returns 400 when status is ACTIVE', async () => {
      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'ACTIVE' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when classesRemaining is negative', async () => {
      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ classesRemaining: -1 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when body is empty', async () => {
      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({})

      expect(res.status).toBe(400)
    })
  })

  describe('updating a membership', () => {
    it('returns 200 with updated membership when pausing', async () => {
      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'PAUSED' })

      expect(res.status).toBe(200)
      expect(mockUpdateMembership).toHaveBeenCalledWith('mem_1', { status: 'PAUSED' })
      expect(res.body).toMatchObject({ status: 'PAUSED' })
    })

    it('returns 200 with updated membership when cancelling', async () => {
      mockUpdateMembership.mockResolvedValue({ ...updatedMembership, status: 'CANCELLED' } as never)

      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'CANCELLED' })

      expect(res.status).toBe(200)
      expect(mockUpdateMembership).toHaveBeenCalledWith('mem_1', { status: 'CANCELLED' })
    })

    it('returns 200 when adjusting classesRemaining', async () => {
      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ classesRemaining: 5 })

      expect(res.status).toBe(200)
      expect(mockUpdateMembership).toHaveBeenCalledWith('mem_1', { classesRemaining: 5 })
    })

    it('returns 404 when membership does not exist', async () => {
      const { NotFoundError } = await import('../lib/errors.js')
      mockUpdateMembership.mockRejectedValue(new NotFoundError('Membership not found'))

      const res = await request(app)
        .patch('/admin/memberships/mem_1')
        .send({ status: 'PAUSED' })

      expect(res.status).toBe(404)
    })
  })
})
