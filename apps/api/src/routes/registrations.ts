import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { enrollStudent, cancelRegistration, listRegistrations } from '../services/registrationService.js'
import { enrollInLessonSet, cancelLessonSetRegistration } from '../services/lessonSetService.js'

export const registrationsRouter = express.Router()

const createRegistrationBodySchema = z.object({
  classId: z.string().min(1),
})

const lessonSetRegistrationBodySchema = z.object({
  lessonSetId: z.string().min(1),
})

const registrationParamsSchema = z.object({ id: z.string().min(1) })
const lessonSetParamsSchema = z.object({ lessonSetId: z.string().min(1) })

registrationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const registrations = await listRegistrations(userId)
    res.status(200).json(registrations)
  })
)

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

registrationsRouter.post(
  '/lesson-set',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lessonSetId } = lessonSetRegistrationBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const registrations = await enrollInLessonSet(lessonSetId, userId)
    res.status(201).json(registrations)
  })
)

registrationsRouter.delete(
  '/lesson-set/:lessonSetId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lessonSetId } = lessonSetParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    await cancelLessonSetRegistration(lessonSetId, userId)
    res.status(200).json({ message: 'Lesson set registration cancelled' })
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
