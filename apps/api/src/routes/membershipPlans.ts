import express from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { listMembershipPlans } from '../services/membershipPlanService.js'

export const membershipPlansRouter = express.Router()

membershipPlansRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const plans = await listMembershipPlans()
    res.status(200).json(plans)
  })
)
