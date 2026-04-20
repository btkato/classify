import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { enrollStudent, cancelRegistration } from '../services/registrationService.js'

export const registrationsRouter = express.Router()

const createRegistrationBodySchema = z.object({
  classId: z.string().min(1),
})

const registrationParamsSchema = z.object({ id: z.string().min(1) })

registrationsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { classId } = createRegistrationBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const registration = await enrollStudent(userId, classId)
    res.status(201).json(registration)
  })
)

registrationsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = registrationParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const registration = await cancelRegistration(id, userId)
    res.status(200).json(registration)
  })
)
