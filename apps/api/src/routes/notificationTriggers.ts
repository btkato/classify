import express from 'express'
import { z } from 'zod'
import { TriggerEvent } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  listNotificationTriggers,
  createNotificationTrigger,
  updateNotificationTrigger,
  deleteNotificationTrigger,
  listTriggerEventConfigs,
} from '../services/notificationTriggerService.js'

export const notificationTriggersRouter = express.Router()

const triggerParamsSchema = z.object({ id: z.string().min(1) })

const createTriggerBodySchema = z.object({
  name: z.string().min(1),
  triggerEvent: z.nativeEnum(TriggerEvent),
  offsetDays: z.number().int(),
  messageTemplate: z.string().min(1),
  isActive: z.boolean().optional(),
})

const updateTriggerBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    triggerEvent: z.nativeEnum(TriggerEvent).optional(),
    offsetDays: z.number().int().optional(),
    messageTemplate: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  })

notificationTriggersRouter.get(
  '/events',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const configs = await listTriggerEventConfigs()
    res.status(200).json(configs)
  })
)

notificationTriggersRouter.get(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const triggers = await listNotificationTriggers()
    res.status(200).json(triggers)
  })
)

notificationTriggersRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId
    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }
    const input = createTriggerBodySchema.parse(req.body)
    const trigger = await createNotificationTrigger({ ...input, createdByUserId: userId })
    res.status(201).json(trigger)
  })
)

notificationTriggersRouter.patch(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = triggerParamsSchema.parse(req.params)
    const input = updateTriggerBodySchema.parse(req.body)
    const trigger = await updateNotificationTrigger(id, input)
    res.status(200).json(trigger)
  })
)

notificationTriggersRouter.delete(
  '/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = triggerParamsSchema.parse(req.params)
    await deleteNotificationTrigger(id)
    res.status(204).send()
  })
)
