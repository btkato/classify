import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import * as userService from '../services/userService.js'

export const usersRouter = Router()

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
})

usersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) throw new NotFoundError('User not found')

    const user = await userService.getUserById(id)
    res.json(user)
  })
)

usersRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) throw new NotFoundError('User not found')

    if (req.auth?.userId !== id) {
      res.status(403).json({ error: { message: 'Forbidden' } })
      return
    }

    const body = updateProfileSchema.parse(req.body)
    const user = await userService.updateProfile(id, body)
    res.json(user)
  })
)
