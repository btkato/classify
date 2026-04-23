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
  listAllMemberships: vi.fn(),
}))

vi.mock('../services/userService.js', () => ({
  listUsers: vi.fn(),
  getUserById: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as roleService from '../services/roleService.js'
import * as membershipService from '../services/membershipService.js'
import * as userService from '../services/userService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockGrantRole = vi.mocked(roleService.grantRole)
const mockRevokeRole = vi.mocked(roleService.revokeRole)
const mockUpdateMembership = vi.mocked(membershipService.updateMembership)
const mockListAllMemberships = vi.mocked(membershipService.listAllMemberships)
const mockListUsers = vi.mocked(userService.listUsers)
const mockGetUserById = vi.mocked(userService.getUserById)

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

describe('GET /admin/users', () => {
  const userPage = {
    data: [{ id: 'user_1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', roles: [{ role: 'STUDENT' }] }],
    total: 1,
    page: 1,
    totalPages: 1,
  }

  beforeEach(() => {
    mockListUsers.mockResolvedValue(userPage as never)
  })

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/admin/users')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).get('/admin/users')

      expect(res.status).toBe(403)
    })
  })

  describe('success', () => {
    it('returns 200 with paginated user list', async () => {
      const res = await request(app).get('/admin/users')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ total: 1, page: 1, totalPages: 1 })
      expect(res.body.data).toHaveLength(1)
    })

    it('passes page and pageSize query params to listUsers', async () => {
      await request(app).get('/admin/users?page=2&pageSize=5')

      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 5 })
      )
    })

    it('passes search query param to listUsers', async () => {
      await request(app).get('/admin/users?search=jane')

      expect(mockListUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'jane' })
      )
    })
  })
})

describe('GET /admin/memberships', () => {
  const membershipPage = {
    data: [{ id: 'mem_1', userId: 'user_1', type: 'MONTHLY', status: 'ACTIVE' }],
    total: 1,
    page: 1,
    totalPages: 1,
  }

  beforeEach(() => {
    mockListAllMemberships.mockResolvedValue(membershipPage as never)
  })

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/admin/memberships')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).get('/admin/memberships')

      expect(res.status).toBe(403)
    })
  })

  describe('success', () => {
    it('returns 200 with paginated membership list', async () => {
      const res = await request(app).get('/admin/memberships')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ total: 1, page: 1, totalPages: 1 })
      expect(res.body.data).toHaveLength(1)
    })

    it('passes page and pageSize query params to listAllMemberships', async () => {
      await request(app).get('/admin/memberships?page=3&pageSize=10')

      expect(mockListAllMemberships).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, pageSize: 10 })
      )
    })

    it('passes status query param to listAllMemberships', async () => {
      await request(app).get('/admin/memberships?status=ACTIVE')

      expect(mockListAllMemberships).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      )
    })
  })
})

describe('GET /admin/users/:id', () => {
  const mockUser = {
    id: 'user_1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    roles: [{ role: 'STUDENT' }],
  }

  beforeEach(() => {
    mockGetUserById.mockResolvedValue(mockUser as never)
  })

  describe('authentication and authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/admin/users/user_1')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).get('/admin/users/user_1')

      expect(res.status).toBe(403)
    })
  })

  describe('success', () => {
    it('returns 200 with the user when admin', async () => {
      const res = await request(app).get('/admin/users/user_1')

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ id: 'user_1', firstName: 'Jane' })
      expect(mockGetUserById).toHaveBeenCalledWith('user_1')
    })
  })

  describe('error handling', () => {
    it('returns 404 when user does not exist', async () => {
      const { NotFoundError } = await import('../lib/errors.js')
      mockGetUserById.mockRejectedValue(new NotFoundError('User not found'))

      const res = await request(app).get('/admin/users/nonexistent')

      expect(res.status).toBe(404)
    })
  })
})
