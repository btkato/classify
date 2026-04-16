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

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as roleService from '../services/roleService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockGrantRole = vi.mocked(roleService.grantRole)
const mockRevokeRole = vi.mocked(roleService.revokeRole)

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
