import express from 'express'
import { z } from 'zod'
import { Role } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { grantRole, revokeRole } from '../services/roleService.js'

export const adminRouter = express.Router()

const updateRoleParamsSchema = z.object({
  id: z.string().min(1),
})

const updateRoleBodySchema = z.object({
  role: z.nativeEnum(Role),
  action: z.enum(['grant', 'revoke']),
})

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
