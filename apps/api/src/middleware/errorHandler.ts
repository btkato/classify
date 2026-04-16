import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from 'db'
import { NotFoundError } from '../lib/errors.js'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err)

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        fields: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    })
    return
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message } })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Resource not found' } })
      return
    }
  }

  if (err instanceof Error) {
    res.status(500).json({ error: { message: err.message } })
    return
  }

  res.status(500).json({ error: { message: 'An unexpected error occurred' } })
}
