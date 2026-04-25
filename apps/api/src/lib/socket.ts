import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

let io: Server | null = null

export function initSocket(server: HttpServer, allowedOrigins: string[]): Server {
  io = new Server(server, {
    cors: { origin: allowedOrigins, credentials: true },
  })
  return io
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
