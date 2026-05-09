import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { listCertifications, createCertification } from '../services/certificationService.js'

export const certificationsRouter = express.Router()

const createCertificationBodySchema = z.object({
  name: z.string().min(1),
  validityPeriodMonths: z.number().int().positive(),
})

certificationsRouter.get(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const certifications = await listCertifications()
    res.status(200).json(certifications)
  })
)

certificationsRouter.post(
  '/',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { name, validityPeriodMonths } = createCertificationBodySchema.parse(req.body)
    const certification = await createCertification(name, validityPeriodMonths)
    res.status(201).json(certification)
  })
)
