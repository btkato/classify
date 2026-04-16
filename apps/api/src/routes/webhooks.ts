import express from 'express'
import { Webhook } from 'svix'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import { createUser } from '../services/userService.js'
import { env } from '../env.js'

export const webhooksRouter = express.Router()

const webhookEventSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
})

const userCreatedDataSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({ email_address: z.string() })).nonempty(),
  first_name: z.string(),
  last_name: z.string(),
})

webhooksRouter.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const svixId = req.headers['svix-id']
    const svixTimestamp = req.headers['svix-timestamp']
    const svixSignature = req.headers['svix-signature']

    if (
      typeof svixId !== 'string' ||
      typeof svixTimestamp !== 'string' ||
      typeof svixSignature !== 'string'
    ) {
      res.status(400).json({ error: { message: 'Missing svix headers' } })
      return
    }

    const webhook = new Webhook(env.CLERK_WEBHOOK_SECRET)

    let payload: unknown

    try {
      payload = webhook.verify(req.body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      })
    } catch {
      res.status(400).json({ error: { message: 'Invalid webhook signature' } })
      return
    }

    const event = webhookEventSchema.parse(payload)

    if (event.type === 'user.created') {
      const data = userCreatedDataSchema.parse(event.data)

      await createUser({
        clerkId: data.id,
        email: data.email_addresses[0].email_address,
        firstName: data.first_name,
        lastName: data.last_name,
      })

      res.status(201).json({ received: true })
      return
    }

    res.status(200).json({ received: true })
  })
)
