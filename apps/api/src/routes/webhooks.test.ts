import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

const mockVerify = vi.fn()

vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(() => ({
    verify: mockVerify,
  })),
}))

vi.mock('../services/userService.js', () => ({
  createUser: vi.fn(),
}))

import { app } from '../app.js'
import * as userService from '../services/userService.js'

const mockCreateUser = vi.mocked(userService.createUser)

const svixHeaders = {
  'svix-id': 'msg_123',
  'svix-timestamp': '1234567890',
  'svix-signature': 'v1,signature',
}

const userCreatedPayload = {
  type: 'user.created',
  data: {
    id: 'clerk_abc',
    email_addresses: [{ email_address: 'jane@example.com' }],
    first_name: 'Jane',
    last_name: 'Doe',
  },
}

function sendWebhook(body: object, headers: Record<string, string> = svixHeaders) {
  return request(app)
    .post('/webhooks/clerk')
    .set('content-type', 'application/json')
    .set(headers)
    .send(Buffer.from(JSON.stringify(body)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /webhooks/clerk', () => {
  describe('when svix headers are missing', () => {
    it('returns 400 when all svix headers are absent', async () => {
      const res = await sendWebhook(userCreatedPayload, {})

      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: { message: 'Missing svix headers' } })
    })

    it('returns 400 when only svix-id is missing', async () => {
      const { 'svix-id': _removed, ...partial } = svixHeaders

      const res = await sendWebhook(userCreatedPayload, partial)

      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: { message: 'Missing svix headers' } })
    })
  })

  describe('when the signature is invalid', () => {
    it('returns 400 when webhook.verify() throws', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Signature mismatch')
      })

      const res = await sendWebhook(userCreatedPayload)

      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: { message: 'Invalid webhook signature' } })
    })
  })

  describe('when the signature is valid', () => {
    beforeEach(() => {
      mockVerify.mockReturnValue(userCreatedPayload)
    })

    it('returns 201 and calls createUser on user.created', async () => {
      const res = await sendWebhook(userCreatedPayload)

      expect(res.status).toBe(201)
      expect(res.body).toEqual({ received: true })
      expect(mockCreateUser).toHaveBeenCalledWith({
        clerkId: 'clerk_abc',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      })
    })

    it('returns 200 and does not call createUser for unknown event types', async () => {
      const unknownEvent = { type: 'user.updated', data: {} }
      mockVerify.mockReturnValue(unknownEvent)

      const res = await sendWebhook(unknownEvent)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ received: true })
      expect(mockCreateUser).not.toHaveBeenCalled()
    })

    it('returns 201 and does not error when user.created fires twice for the same user', async () => {
      mockCreateUser.mockResolvedValueOnce({ id: 'clerk_abc' } as never)
      mockCreateUser.mockResolvedValueOnce({ id: 'clerk_abc' } as never)

      await sendWebhook(userCreatedPayload)
      const res = await sendWebhook(userCreatedPayload)

      expect(res.status).toBe(201)
      expect(mockCreateUser).toHaveBeenCalledTimes(2)
    })
  })
})
