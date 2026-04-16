import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createCategory, listCategories } from '../services/classCategoryService.js'

export const classCategoriesRouter = express.Router()

const createCategoryBodySchema = z.object({
  name: z.string().min(1),
})

classCategoriesRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { name } = createCategoryBodySchema.parse(req.body)
    const category = await createCategory(name)
    res.status(201).json(category)
  })
)

classCategoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await listCategories()
    res.status(200).json(categories)
  })
)
