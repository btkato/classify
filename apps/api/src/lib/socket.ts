import { Server } from 'socket.io'
import { verifyToken } from '@clerk/express'
import type { Server as HttpServer } from 'http'

let io: Server | null = null

export function initSocket(server: HttpServer, allowedOrigins: string[], secretKey: string): Server {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  })

  io.use(async (socket, next) => {
    const token: unknown = socket.handshake.auth['token']
    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('Authentication required'))
      return
    }
    try {
      const payload = await verifyToken(token, { secretKey })
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  return io
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
