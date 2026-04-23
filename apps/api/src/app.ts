import express from 'express'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { errorHandler } from './middleware/errorHandler.js'
import { usersRouter } from './routes/users.js'
import { webhooksRouter } from './routes/webhooks.js'
import { adminRouter } from './routes/admin.js'
import { classCategoriesRouter } from './routes/classCategories.js'
import { classesRouter } from './routes/classes.js'
import { membershipsRouter } from './routes/memberships.js'
import { registrationsRouter } from './routes/registrations.js'
import { lessonSetsRouter } from './routes/lessonSets.js'

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
  'http://localhost:5173',
  'http://localhost:4173',
]

export const app = express()

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(clerkMiddleware())

app.use('/webhooks', webhooksRouter)

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/users', usersRouter)
app.use('/admin', adminRouter)
app.use('/class-categories', classCategoriesRouter)
app.use('/classes', classesRouter)
app.use('/memberships', membershipsRouter)
app.use('/registrations', registrationsRouter)
app.use('/lesson-sets', lessonSetsRouter)

app.use(errorHandler)
