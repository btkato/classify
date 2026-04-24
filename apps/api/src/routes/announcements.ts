import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { sendAnnouncement } from '../services/announcementService.js'

export const announcementsRouter = express.Router()

const sendAnnouncementBodySchema = z.object({
  classId: z.string().min(1),
  body: z.string().min(1),
})

announcementsRouter.post(
  '/',
  requireAuth,
  requireRoles(['INSTRUCTOR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const senderId = req.auth?.userId
    if (!senderId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const { classId, body } = sendAnnouncementBodySchema.parse(req.body)
    const isAdmin = (req.userRoles ?? []).some((userRole) => userRole.role === 'ADMIN')
    const message = await sendAnnouncement({ classId, senderId, body, isAdmin })
    res.status(201).json(message)
  })
)
