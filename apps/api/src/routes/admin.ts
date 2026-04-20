import express from 'express'
import { z } from 'zod'
import { Role } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { grantRole, revokeRole } from '../services/roleService.js'
import { updateMembership } from '../services/membershipService.js'

export const adminRouter = express.Router()

const updateRoleParamsSchema = z.object({
  id: z.string().min(1),
})

const updateRoleBodySchema = z.object({
  role: z.nativeEnum(Role),
  action: z.enum(['grant', 'revoke']),
})

const updateMembershipParamsSchema = z.object({
  id: z.string().min(1),
})

const updateMembershipBodySchema = z
  .object({
    classesRemaining: z.number().int().min(0).optional(),
    status: z.enum(['PAUSED', 'CANCELLED']).optional(),
  })
  .refine((data) => data.classesRemaining !== undefined || data.status !== undefined, {
    message: 'At least one of classesRemaining or status must be provided',
  })

adminRouter.patch(
  '/memberships/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = updateMembershipParamsSchema.parse(req.params)
    const input = updateMembershipBodySchema.parse(req.body)

    const membership = await updateMembership(id, input)

    res.status(200).json(membership)
  })
)

adminRouter.patch(
  '/users/:id/roles',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = updateRoleParamsSchema.parse(req.params)
    const { role, action } = updateRoleBodySchema.parse(req.body)

    if (action === 'grant') {
      await grantRole(id, role)
    } else {
      await revokeRole(id, role)
    }

    res.status(200).json({ success: true })
  })
)
