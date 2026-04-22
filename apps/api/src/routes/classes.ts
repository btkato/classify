import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createClass, listClasses, getClass, updateClass, cancelClass, getRoster } from '../services/classService.js'

export const classesRouter = express.Router()

const listClassesQuerySchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    instructorId: z.string().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ['to'],
    message: '`to` must be greater than or equal to `from`',
  })

const updateClassBodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  startsAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  location: z.string().min(1).optional(),
})

const createClassBodySchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  capacity: z.number().int().min(1),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().min(1),
  location: z.string().min(1).optional(),
})

classesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listClassesQuerySchema.parse(req.query)
    const result = await listClasses({
      categoryId: query.categoryId,
      instructorId: query.instructorId,
      from: query.from,
      to: query.to,
      page: query.page,
      pageSize: query.pageSize,
    })
    res.status(200).json(result)
  })
)

const classParamsSchema = z.object({ id: z.string().min(1) })

classesRouter.get(
  '/:id/roster',
  requireAuth,
  requireRoles(['INSTRUCTOR', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = classParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const isAdmin = (req.userRoles ?? []).some((role) => role.role === 'ADMIN')
    const roster = await getRoster(id, userId, isAdmin)
    res.status(200).json(roster)
  })
)

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

    const isAdmin = (req.userRoles ?? []).some((role) => role.role === 'ADMIN')

    const updatedClass = await updateClass(id, body, userId, isAdmin)
    res.status(200).json(updatedClass)
  })
)

classesRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = classParamsSchema.parse(req.params)
    const cancelledClass = await cancelClass(id)
    res.status(200).json(cancelledClass)
  })
)

classesRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
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
    })

    res.status(201).json(newClass)
  })
)
