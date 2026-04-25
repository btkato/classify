import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createDirectMessage, getInbox, getThread, replyToThread } from '../services/messageService.js'

export const messagesRouter = express.Router()

const threadParamsSchema = z.object({ threadId: z.string().min(1) })

const createDirectMessageBodySchema = z.object({
  instructorId: z.string().min(1),
  body: z.string().min(1),
})

const replyBodySchema = z.object({
  body: z.string().min(1),
})

messagesRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const adminId = req.auth?.userId
    if (!adminId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const { instructorId, body } = createDirectMessageBodySchema.parse(req.body)
    const message = await createDirectMessage({ adminId, instructorId, body })
    res.status(201).json(message)
  })
)

messagesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const inbox = await getInbox(userId)
    res.status(200).json(inbox)
  })
)

messagesRouter.post(
  '/:threadId/reply',
  requireAuth,
  asyncHandler(async (req, res) => {
    const senderId = req.auth?.userId
    if (!senderId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const { threadId } = threadParamsSchema.parse(req.params)
    const { body } = replyBodySchema.parse(req.body)
    const message = await replyToThread({ threadId, senderId, body })
    res.status(201).json(message)
  })
)

messagesRouter.get(
  '/:threadId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const { threadId } = threadParamsSchema.parse(req.params)
    const thread = await getThread(userId, threadId)
    res.status(200).json(thread)
  })
)
