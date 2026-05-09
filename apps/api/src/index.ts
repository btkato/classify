import './env.js'
import http from 'http'
import { app } from './app.js'
import { env } from './env.js'
import { initSocket } from './lib/socket.js'
import { notificationQueue } from './lib/queue.js'
import { startNotificationWorker } from './workers/notificationWorker.js'

const PORT = process.env.PORT ?? 3000
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
  'http://localhost:5173',
  'http://localhost:4173',
]

const httpServer = http.createServer(app)
const io = initSocket(httpServer, allowedOrigins, env.CLERK_SECRET_KEY)

io.on('connection', (socket) => {
  const userId: unknown = socket.data.userId
  if (typeof userId === 'string' && userId.length > 0) {
    socket.join(`user:${userId}`)
  }
})

httpServer.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
  void notificationQueue.add('poll', {}, { repeat: { every: 60_000 } })
  startNotificationWorker()
})
