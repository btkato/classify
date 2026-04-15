import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { Role } from 'db'
import { prisma } from '../lib/prisma.js'

export function requireRoles(allowedRoles: Role[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId: req.auth.userId },
      select: { role: true },
    })

    const hasRole = userRoles.some((userRole) => allowedRoles.includes(userRole.role))

    if (!hasRole) {
      res.status(403).json({ error: { message: 'Forbidden' } })
      return
    }

    next()
  }
}
