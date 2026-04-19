import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { ZodError, ZodIssueCode } from 'zod'
import { Prisma } from 'db'
import { errorHandler } from './errorHandler.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors.js'

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response
}

const req = {} as Request
const next = vi.fn() as unknown as NextFunction

describe('errorHandler middleware', () => {
  it('returns 400 with field errors when a ZodError is thrown', () => {
    const err = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'String must contain at least 1 character(s)',
        path: ['name'],
      },
    ])
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation failed',
        fields: [{ path: 'name', message: 'String must contain at least 1 character(s)' }],
      },
    })
  })

  it('returns 404 when a NotFoundError is thrown', () => {
    const err = new NotFoundError('Category not found')
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Category not found' } })
  })

  it('returns 400 when a ValidationError is thrown', () => {
    const err = new ValidationError('Class must start in the future')
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Class must start in the future' } })
  })

  it('returns 403 when a ForbiddenError is thrown', () => {
    const err = new ForbiddenError('You do not have permission to update this class')
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'You do not have permission to update this class' } })
  })

  it('returns 404 when a Prisma P2025 error is thrown', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.7.0',
    })
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Resource not found' } })
  })

  it('returns 409 when a Prisma P2002 error is thrown', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.7.0',
    })
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'A record with that value already exists' } })
  })

  it('returns 500 for a generic Error', () => {
    const err = new Error('Something went wrong')
    const res = makeRes()

    errorHandler(err, req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Something went wrong' } })
  })

  it('returns 500 for an unknown thrown value', () => {
    const res = makeRes()

    errorHandler('some string error', req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'An unexpected error occurred' } })
  })
})
