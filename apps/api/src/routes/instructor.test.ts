import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { NotFoundError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: { findMany: vi.fn() },
  },
}))

vi.mock('../services/certificationService.js', () => ({
  assignInstructorCertifications: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as certificationService from '../services/certificationService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockAssign = vi.mocked(certificationService.assignInstructorCertifications)

const assignedCerts = [
  {
    id: 'ic_1',
    instructorId: 'instructor_1',
    certificationId: 'cert_1',
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'admin_1' } as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('PATCH /instructor/:id/certifications', () => {
  describe('authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [] })

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [] })

      expect(res.status).toBe(403)
    })
  })

  describe('request validation', () => {
    it('returns 400 when certifications array is missing', async () => {
      const res = await request(app).patch('/instructor/instructor_1/certifications').send({})

      expect(res.status).toBe(400)
    })

    it('returns 400 when a certification entry is missing certificationId', async () => {
      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [{ issuedAt: '2026-01-01' }] })

      expect(res.status).toBe(400)
    })

    it('returns 400 when a certification entry is missing issuedAt', async () => {
      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [{ certificationId: 'cert_1' }] })

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('calls assignInstructorCertifications with instructorId and parsed assignments, returns 200', async () => {
      mockAssign.mockResolvedValue(assignedCerts as never)

      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({
          certifications: [{ certificationId: 'cert_1', issuedAt: '2026-01-01' }],
        })

      expect(res.status).toBe(200)
      expect(mockAssign).toHaveBeenCalledWith(
        'instructor_1',
        [{ certificationId: 'cert_1', issuedAt: new Date('2026-01-01') }]
      )
      expect(res.body).toHaveLength(1)
    })

    it('accepts an empty certifications array to clear all certifications', async () => {
      mockAssign.mockResolvedValue([] as never)

      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [] })

      expect(res.status).toBe(200)
      expect(mockAssign).toHaveBeenCalledWith('instructor_1', [])
    })
  })

  describe('error handling', () => {
    it('returns 404 when service throws NotFoundError', async () => {
      mockAssign.mockRejectedValue(new NotFoundError('Instructor not found'))

      const res = await request(app)
        .patch('/instructor/instructor_1/certifications')
        .send({ certifications: [] })

      expect(res.status).toBe(404)
    })
  })
})
