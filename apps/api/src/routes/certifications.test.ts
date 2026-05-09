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
  listCertifications: vi.fn(),
  createCertification: vi.fn(),
}))

import { app } from '../app.js'
import { getAuth } from '@clerk/express'
import { prisma } from '../lib/prisma.js'
import * as certificationService from '../services/certificationService.js'

const mockGetAuth = vi.mocked(getAuth)
const mockFindMany = vi.mocked(prisma.userRole.findMany)
const mockListCertifications = vi.mocked(certificationService.listCertifications)
const mockCreateCertification = vi.mocked(certificationService.createCertification)

const baseCert = { id: 'cert_1', name: 'CPR', validityPeriodMonths: 12, createdAt: new Date().toISOString() }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'admin_1' } as never)
  mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)
})

describe('GET /certifications', () => {
  describe('authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).get('/certifications')

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).get('/certifications')

      expect(res.status).toBe(403)
    })
  })

  describe('success', () => {
    it('calls listCertifications and returns 200 with the array', async () => {
      mockListCertifications.mockResolvedValue([baseCert] as never)

      const res = await request(app).get('/certifications')

      expect(res.status).toBe(200)
      expect(mockListCertifications).toHaveBeenCalled()
      expect(res.body).toHaveLength(1)
      expect(res.body[0]).toMatchObject({ id: 'cert_1', name: 'CPR' })
    })
  })
})

describe('POST /certifications', () => {
  describe('authorisation', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetAuth.mockReturnValue({ userId: null } as never)

      const res = await request(app).post('/certifications').send({ name: 'CPR', validityPeriodMonths: 12 })

      expect(res.status).toBe(401)
    })

    it('returns 403 when authenticated as STUDENT', async () => {
      mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

      const res = await request(app).post('/certifications').send({ name: 'CPR', validityPeriodMonths: 12 })

      expect(res.status).toBe(403)
    })
  })

  describe('request validation', () => {
    it('returns 400 when name is missing', async () => {
      const res = await request(app).post('/certifications').send({ validityPeriodMonths: 12 })

      expect(res.status).toBe(400)
    })

    it('returns 400 when validityPeriodMonths is missing', async () => {
      const res = await request(app).post('/certifications').send({ name: 'CPR' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when validityPeriodMonths is not a positive integer', async () => {
      const res = await request(app).post('/certifications').send({ name: 'CPR', validityPeriodMonths: 0 })

      expect(res.status).toBe(400)
    })
  })

  describe('success', () => {
    it('calls createCertification with name and validityPeriodMonths, returns 201', async () => {
      mockCreateCertification.mockResolvedValue(baseCert as never)

      const res = await request(app).post('/certifications').send({ name: 'CPR', validityPeriodMonths: 12 })

      expect(res.status).toBe(201)
      expect(mockCreateCertification).toHaveBeenCalledWith('CPR', 12)
      expect(res.body).toMatchObject({ id: 'cert_1', name: 'CPR' })
    })
  })
})
