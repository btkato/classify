import express from 'express'
import { z } from 'zod'
import { MembershipType } from 'db'

const historyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(5),
})
import { requireAuth } from '../middleware/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createMembership, listMemberships, listMembershipHistory, getMembership, cancelMembership, resumeMembership } from '../services/membershipService.js'

export const membershipsRouter = express.Router()

const createMembershipBodySchema = z.object({
  type: z.nativeEnum(MembershipType),
})

const membershipParamsSchema = z.object({ id: z.string().min(1) })

membershipsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { type } = createMembershipBodySchema.parse(req.body)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const membership = await createMembership(userId, type)
    res.status(201).json(membership)
  })
)

membershipsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const memberships = await listMemberships(userId)
    res.status(200).json(memberships)
  })
)

membershipsRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const { page, limit } = historyQuerySchema.parse(req.query)
    const result = await listMembershipHistory(userId, page, limit)
    res.status(200).json(result)
  })
)

membershipsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = membershipParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const membership = await getMembership(id, userId, false)
    res.status(200).json(membership)
  })
)

membershipsRouter.patch(
  '/:id/resume',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = membershipParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const membership = await resumeMembership(id, userId)
    res.status(200).json(membership)
  })
)

membershipsRouter.patch(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = membershipParamsSchema.parse(req.params)
    const userId = req.auth?.userId

    if (!userId) {
      res.status(401).json({ error: { message: 'Unauthorized' } })
      return
    }

    const membership = await cancelMembership(id, userId)
    res.status(200).json(membership)
  })
)
