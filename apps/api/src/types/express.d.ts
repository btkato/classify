import type { Role } from 'db'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string
      }
      userRoles?: { role: Role }[]
    }
  }
}

export {}
