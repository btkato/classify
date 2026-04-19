import type { Role } from 'db'

declare namespace Express {
  interface Request {
    auth?: {
      userId: string
    }
    userRoles?: { role: Role }[]
  }
}
