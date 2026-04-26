import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import {
  listNotificationTriggers,
  createNotificationTrigger,
  updateNotificationTrigger,
  deleteNotificationTrigger,
} from './notificationTriggerService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    notificationTrigger: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

const mockFindMany = vi.mocked(prisma.notificationTrigger.findMany)
const mockCreate = vi.mocked(prisma.notificationTrigger.create)
const mockUpdate = vi.mocked(prisma.notificationTrigger.update)
const mockDelete = vi.mocked(prisma.notificationTrigger.delete)

const baseTrigger = {
  id: 'trigger_1',
  createdByUserId: 'admin_1',
  name: 'Expiring soon',
  triggerEvent: 'MEMBERSHIP_EXPIRING' as const,
  offsetDays: -7,
  messageTemplate: 'Hi {student}, your membership expires in {days} days.',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listNotificationTriggers', () => {
  it('returns triggers ordered by createdAt desc', async () => {
    mockFindMany.mockResolvedValue([baseTrigger] as never)

    const result = await listNotificationTriggers()

    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } })
    expect(result).toEqual([baseTrigger])
  })

  it('returns an empty array when there are no triggers', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await listNotificationTriggers()

    expect(result).toEqual([])
  })
})

describe('createNotificationTrigger', () => {
  it('creates a trigger with the provided input', async () => {
    mockCreate.mockResolvedValue(baseTrigger as never)

    const input = {
      createdByUserId: 'admin_1',
      name: 'Expiring soon',
      triggerEvent: 'MEMBERSHIP_EXPIRING' as const,
      offsetDays: -7,
      messageTemplate: 'Hi {student}, your membership expires in {days} days.',
    }

    const result = await createNotificationTrigger(input)

    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result).toEqual(baseTrigger)
  })

  it('creates an inactive trigger when isActive is false', async () => {
    const inactiveTrigger = { ...baseTrigger, isActive: false }
    mockCreate.mockResolvedValue(inactiveTrigger as never)

    const input = {
      createdByUserId: 'admin_1',
      name: 'Expiring soon',
      triggerEvent: 'MEMBERSHIP_EXPIRING' as const,
      offsetDays: -7,
      messageTemplate: 'Hi {student}',
      isActive: false,
    }

    const result = await createNotificationTrigger(input)

    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result.isActive).toBe(false)
  })
})

describe('updateNotificationTrigger', () => {
  it('updates the trigger with the provided fields', async () => {
    const updated = { ...baseTrigger, isActive: false }
    mockUpdate.mockResolvedValue(updated as never)

    const result = await updateNotificationTrigger('trigger_1', { isActive: false })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'trigger_1' },
      data: { isActive: false },
    })
    expect(result).toEqual(updated)
  })

  it('updates only the name when only name is provided', async () => {
    const updated = { ...baseTrigger, name: 'Renamed trigger' }
    mockUpdate.mockResolvedValue(updated as never)

    const result = await updateNotificationTrigger('trigger_1', { name: 'Renamed trigger' })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'trigger_1' },
      data: { name: 'Renamed trigger' },
    })
    expect(result.name).toBe('Renamed trigger')
  })
})

describe('deleteNotificationTrigger', () => {
  it('deletes the trigger by id and returns it', async () => {
    mockDelete.mockResolvedValue(baseTrigger as never)

    const result = await deleteNotificationTrigger('trigger_1')

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'trigger_1' } })
    expect(result).toEqual(baseTrigger)
  })
})
