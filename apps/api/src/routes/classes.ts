import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createClass, listClasses } from '../services/classService.js'

export const classesRouter = express.Router()

const listClassesQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

const createClassBodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  capacity: z.number().int().min(1),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().min(1),
  location: z.string().min(1).optional(),
  recurringGroupId: z.string().min(1).optional(),
})

classesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listClassesQuerySchema.parse(req.query)
    const classes = await listClasses({
      categoryId: query.categoryId,
      from: query.from,
      to: query.to,
    })
    res.status(200).json(classes)
  })
)

classesRouter.post(
  '/',
  requireAuth,
  requireRoles(['INSTRUCTOR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const body = createClassBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const newClass = await createClass({
      instructorId: userId,
      categoryId: body.categoryId,
      title: body.title,
      description: body.description,
      capacity: body.capacity,
      startsAt: body.startsAt,
      durationMinutes: body.durationMinutes,
      location: body.location,
      recurringGroupId: body.recurringGroupId,
    })

    res.status(201).json(newClass)
  })
)
