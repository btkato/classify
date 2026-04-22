import express from 'express'
import { z } from 'zod'
import { EnrollmentType, ClassStatus } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  createLessonSet,
  listLessonSets,
  getLessonSet,
  updateLessonSet,
  cancelLessonSet,
} from '../services/lessonSetService.js'

export const lessonSetsRouter = express.Router()

const createLessonSetBodySchema = z.object({
  instructorId: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  enrollmentType: z.nativeEnum(EnrollmentType),
  totalSessions: z.number().int().min(1),
  categoryId: z.string().min(1),
  capacity: z.number().int().min(1),
  durationMinutes: z.number().int().min(1),
  firstSessionStartsAt: z.coerce.date(),
  intervalDays: z.number().int().min(1),
  location: z.string().min(1).optional(),
  sessionOverrides: z
    .array(
      z.object({
        sessionNumber: z.number().int().min(1),
        startsAt: z.coerce.date().optional(),
        location: z.string().min(1).optional(),
      })
    )
    .optional(),
})

const updateLessonSetBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.nativeEnum(ClassStatus).optional(),
})

const lessonSetParamsSchema = z.object({ id: z.string().min(1) })

lessonSetsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const lessonSets = await listLessonSets()
    res.status(200).json(lessonSets)
  })
)

lessonSetsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = lessonSetParamsSchema.parse(req.params)
    const lessonSet = await getLessonSet(id)
    res.status(200).json(lessonSet)
  })
)

lessonSetsRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const body = createLessonSetBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const lessonSet = await createLessonSet({ ...body, instructorId: body.instructorId ?? userId })
    res.status(201).json(lessonSet)
  })
)

lessonSetsRouter.patch(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = lessonSetParamsSchema.parse(req.params)
    const body = updateLessonSetBodySchema.parse(req.body)
    const updatedLessonSet = await updateLessonSet(id, body)
    res.status(200).json(updatedLessonSet)
  })
)

lessonSetsRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = lessonSetParamsSchema.parse(req.params)
    const cancelled = await cancelLessonSet(id)
    res.status(200).json(cancelled)
  })
)
