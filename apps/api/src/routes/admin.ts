import express from 'express'
import { z } from 'zod'
import { Role, MembershipStatus, NotificationStatus } from 'db'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { grantRole, revokeRole } from '../services/roleService.js'
import { updateMembership, listAllMemberships } from '../services/membershipService.js'
import { listUsers, getUserById } from '../services/userService.js'
import { listNotificationJobs } from '../services/notificationService.js'

export const adminRouter = express.Router()

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
  search: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
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

const adminUserParamsSchema = z.object({ id: z.string().min(1) })

adminRouter.get(
  '/users/:id',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = adminUserParamsSchema.parse(req.params)
    const user = await getUserById(id)
    res.status(200).json(user)
  })
)

const updateRoleParamsSchema = z.object({
  id: z.string().min(1),
})

const updateRoleBodySchema = z.object({
  role: z.nativeEnum(Role),
  action: z.enum(['grant', 'revoke']),
})

const listMembershipsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
  status: z.nativeEnum(MembershipStatus).optional(),
  search: z.string().min(1).optional(),
})

adminRouter.get(
  '/memberships',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, search } = listMembershipsQuerySchema.parse(req.query)
    const result = await listAllMemberships({ page, pageSize, status, search })
    res.status(200).json(result)
  })
)

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

const listNotificationJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
  status: z.nativeEnum(NotificationStatus).optional(),
  triggerId: z.string().min(1).optional(),
})

adminRouter.get(
  '/notification-jobs',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const query = listNotificationJobsQuerySchema.parse(req.query)
    const result = await listNotificationJobs(query)
    res.status(200).json(result)
  })
)
