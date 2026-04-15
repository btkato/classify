import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireAuth } from './requireAuth.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) =>
    next(),
  getAuth: vi.fn(),
}))

import { getAuth } from '@clerk/express'

const mockGetAuth = vi.mocked(getAuth)

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireAuth middleware', () => {
  it('attaches userId to req.auth and calls next() when authenticated', () => {
    mockGetAuth.mockReturnValue({ userId: 'user_123' } as never)

    const req = {} as Request
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res, next)

    expect(req.auth).toEqual({ userId: 'user_123' })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it('returns 401 when no userId is present', () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const req = {} as Request
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Unauthorized' },
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when getAuth returns undefined userId', () => {
    mockGetAuth.mockReturnValue({ userId: undefined } as never)

    const req = {} as Request
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
