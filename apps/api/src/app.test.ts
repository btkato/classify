import request from 'supertest'
import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: () => ({ userId: null }),
}))

import { app } from './app.js'

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
