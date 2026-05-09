import express from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireRoles } from '../middleware/requireRoles.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { assignInstructorCertifications } from '../services/certificationService.js'

export const instructorRouter = express.Router()

const instructorParamsSchema = z.object({ id: z.string().min(1) })

const assignCertificationsBodySchema = z.object({
  certifications: z.array(
    z.object({
      certificationId: z.string().min(1),
      issuedAt: z.coerce.date(),
    })
  ),
})

instructorRouter.patch(
  '/:id/certifications',
  requireAuth,
  requireRoles(['ADMIN']),
  asyncHandler(async (req, res) => {
    const { id } = instructorParamsSchema.parse(req.params)
    const { certifications } = assignCertificationsBodySchema.parse(req.body)
    const result = await assignInstructorCertifications(id, certifications)
    res.status(200).json(result)
  })
)
