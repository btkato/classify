import express from 'express'
import { z } from 'zod'
import { Role } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { grantRole, revokeRole } from '../services/roleService.js'
import { updateMembership } from '../services/membershipService.js'
import { listUsers } from '../services/userService.js'

export const adminRouter = express.Router()

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
  search: z.string().min(1).optional(),
})

adminRouter.get(
  '/users',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const query = listUsersQuerySchema.parse(req.query)
    const result = await listUsers(query)
    res.status(200).json(result)
  })
)

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
