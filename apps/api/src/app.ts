import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { errorHandler } from './middleware/errorHandler.js'
import { usersRouter } from './routes/users.js'
import { webhooksRouter } from './routes/webhooks.js'
import { adminRouter } from './routes/admin.js'
import { classCategoriesRouter } from './routes/classCategories.js'
import { classesRouter } from './routes/classes.js'
import { membershipsRouter } from './routes/memberships.js'

export const app = express()

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

app.use(errorHandler)
