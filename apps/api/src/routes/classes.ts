import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createClass, listClasses, getClass, updateClass } from '../services/classService.js'
import { prisma } from '../lib/prisma.js'

export const classesRouter = express.Router()

const listClassesQuerySchema = z.object({
  categoryId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

const updateClassBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  location: z.string().min(1).optional(),
  recurringGroupId: z.string().min(1).optional(),
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

const classParamsSchema = z.object({ id: z.string().min(1) })

classesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = classParamsSchema.parse(req.params)
    const foundClass = await getClass(id)
    res.status(200).json(foundClass)
  })
)

classesRouter.patch(
  '/:id',
  requireAuth,
  requireRoles(['INSTRUCTOR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = classParamsSchema.parse(req.params)
    const body = updateClassBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const roles = await prisma.userRole.findMany({ where: { userId } })
    const isAdmin = roles.some((role) => role.role === 'ADMIN')

    const updatedClass = await updateClass(id, body, userId, isAdmin)
    res.status(200).json(updatedClass)
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
