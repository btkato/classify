import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireRoles } from './requireRoles.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockFindMany = vi.mocked(prisma.userRole.findMany)

function makeReq(userId: string | undefined) {
  return { auth: userId ? { userId } : undefined } as Request
}

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireRoles middleware', () => {
  it('calls next() when user holds an allowed role', async () => {
    mockFindMany.mockResolvedValue([{ role: 'ADMIN' }] as never)

    const req = makeReq('user_123')
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await requireRoles(['ADMIN'])(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('calls next() when user holds one of multiple allowed roles', async () => {
    mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const req = makeReq('user_123')
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await requireRoles(['INSTRUCTOR', 'ADMIN'])(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when user does not hold an allowed role', async () => {
    mockFindMany.mockResolvedValue([{ role: 'STUDENT' }] as never)

    const req = makeReq('user_123')
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await await requireRoles(['ADMIN'])(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Forbidden' },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when user has no roles at all', async () => {
    mockFindMany.mockResolvedValue([] as never)

    const req = makeReq('user_123')
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await await requireRoles(['ADMIN'])(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('attaches userRoles to req before calling next()', async () => {
    mockFindMany.mockResolvedValue([{ role: 'INSTRUCTOR' }] as never)

    const req = makeReq('user_123')
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await requireRoles(['INSTRUCTOR'])(req, res, next)

    expect(req.userRoles).toEqual([{ role: 'INSTRUCTOR' }])
    expect(next).toHaveBeenCalledOnce()
  })

  it('returns 401 when req.auth is missing', async () => {
    const req = makeReq(undefined)
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    await await requireRoles(['ADMIN'])(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Unauthorized' },
    })
    expect(next).not.toHaveBeenCalled()
  })
})
