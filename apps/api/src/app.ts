import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { errorHandler } from './middleware/errorHandler.js'

export const app = express()

app.use(clerkMiddleware())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(errorHandler)
