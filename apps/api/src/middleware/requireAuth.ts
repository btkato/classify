import type { Request, Response, NextFunction } from 'express'
import { getAuth } from '@clerk/express'

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { userId } = getAuth(req)

  if (!userId) {
    res.status(401).json({ error: { message: 'Unauthorized' } })
    return
  }

  req.auth = { userId }
  next()
}
