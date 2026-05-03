import { prisma } from '../lib/prisma.js'
import type { NotificationTrigger, TriggerEventConfig, TriggerEvent } from 'db'

interface CreateTriggerInput {
  createdByUserId: string
  name: string
  triggerEvent: TriggerEvent
  offsetDays: number
  threshold?: number | null
  messageTemplate: string
  isActive?: boolean
}

interface UpdateTriggerInput {
  name?: string
  triggerEvent?: TriggerEvent
  offsetDays?: number
  threshold?: number | null
  messageTemplate?: string
  isActive?: boolean
}

export async function listNotificationTriggers(): Promise<NotificationTrigger[]> {
  return prisma.notificationTrigger.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function createNotificationTrigger(input: CreateTriggerInput): Promise<NotificationTrigger> {
  return prisma.notificationTrigger.create({ data: input })
}

export async function updateNotificationTrigger(id: string, input: UpdateTriggerInput): Promise<NotificationTrigger> {
  return prisma.notificationTrigger.update({ where: { id }, data: input })
}

export async function deleteNotificationTrigger(id: string): Promise<NotificationTrigger> {
  return prisma.notificationTrigger.delete({ where: { id } })
}

export async function listTriggerEventConfigs(): Promise<TriggerEventConfig[]> {
  return prisma.triggerEventConfig.findMany()
}
