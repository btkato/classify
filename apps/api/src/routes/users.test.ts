import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'
import { NotFoundError } from '../lib/errors.js'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  getAuth: vi.fn(),
}))

vi.mock('../services/userService.js', () => ({
  getUserById: vi.fn(),
  updateProfile: vi.fn(),
}))

import { app } from '../app.js'
import * as userService from '../services/userService.js'
import { getAuth } from '@clerk/express'

const mockGetAuth = vi.mocked(getAuth)
const mockGetUserById = vi.mocked(userService.getUserById)
const mockUpdateProfile = vi.mocked(userService.updateProfile)

const mockUser = {
  id: 'user_123',
  email: 'user@example.com',
  firstName: 'User',
  lastName: 'Test',
  clerkId: 'clerk_123',
  roles: [{ role: 'STUDENT' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuth.mockReturnValue({ userId: 'user_123' } as never)
})

describe('GET /users/me', () => {
  it('returns 200 with the authenticated user', async () => {
    mockGetUserById.mockResolvedValue(mockUser as never)

    const res = await request(app).get('/users/me')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockUser)
    expect(mockGetUserById).toHaveBeenCalledWith('user_123')
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).get('/users/me')

    expect(res.status).toBe(401)
  })
})

describe('GET /users/:id', () => {
  it('returns 200 with user data when authenticated', async () => {
    mockGetUserById.mockResolvedValue(mockUser as never)

    const res = await request(app).get('/users/user_123')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockUser)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app).get('/users/user_123')

    expect(res.status).toBe(401)
  })

  it('returns 404 when user does not exist', async () => {
    mockGetUserById.mockRejectedValue(new NotFoundError('User not found'))

    const res = await request(app).get('/users/user_123')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: { message: 'User not found' } })
  })
})

describe('PATCH /users/:id', () => {
  it('returns 200 with updated user when authenticated', async () => {
    const updated = { ...mockUser, firstName: 'Use' }
    mockUpdateProfile.mockResolvedValue(updated as never)

    const res = await request(app)
      .patch('/users/user_123')
      .send({ firstName: 'Use' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(updated)
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuth.mockReturnValue({ userId: null } as never)

    const res = await request(app)
      .patch('/users/user_123')
      .send({ firstName: 'Use' })

    expect(res.status).toBe(401)
  })

  it('returns 403 when user tries to update another users profile', async () => {
    const res = await request(app)
      .patch('/users/different_user_456')
      .send({ firstName: 'NewUse' })

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: { message: 'Forbidden' } })
  })

  it('returns 400 when request body fails validation', async () => {
    const res = await request(app)
      .patch('/users/user_123')
      .send({ firstName: 123 })

    expect(res.status).toBe(400)
  })
})
