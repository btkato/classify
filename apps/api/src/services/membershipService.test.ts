import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import {
  createMembership,
  listMemberships,
  getMembership,
  getValidMembership,
  updateMembership,
  cancelMembership,
} from './membershipService.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    membership: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membershipTransaction: {
      create: vi.fn(),
    },
    notificationTrigger: {
      findMany: vi.fn(),
    },
    notificationJob: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockCreate = vi.mocked(prisma.membership.create)
const mockFindMany = vi.mocked(prisma.membership.findMany)
const mockFindUnique = vi.mocked(prisma.membership.findUnique)
const mockUpdate = vi.mocked(prisma.membership.update)
const mockTransactionCreate = vi.mocked(prisma.membershipTransaction.create)
const mockTransaction = vi.mocked(prisma.$transaction)
const mockTriggerFindMany = vi.mocked(prisma.notificationTrigger.findMany)
const mockJobCreateMany = vi.mocked(prisma.notificationJob.createMany)

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
  mockTriggerFindMany.mockResolvedValue([])
  mockJobCreateMany.mockResolvedValue({ count: 0 } as never)
})

const baseMembership = {
  id: 'mem_1',
  userId: 'user_1',
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('createMembership', () => {
  describe('time-based memberships', () => {
    const frozenNow = new Date('2026-01-01T00:00:00.000Z')

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(frozenNow)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates a MONTHLY membership with priority 1, no class counts, and expiresAt 30 days from now', async () => {
      const membership = {
        ...baseMembership,
        type: 'MONTHLY',
        priority: 1,
        classesTotal: null,
        classesRemaining: null,
        expiresAt: new Date('2026-01-31T00:00:00.000Z'),
      }
      mockCreate.mockResolvedValue(membership as never)

      await createMembership('user_1', 'MONTHLY')

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          type: 'MONTHLY',
          status: 'ACTIVE',
          priority: 1,
          classesTotal: null,
          classesRemaining: null,
          expiresAt: new Date('2026-01-31T00:00:00.000Z'),
        }),
      })
    })

    it('creates a CONTINUOUS_MONTHLY membership with priority 1 and expiresAt 30 days from now', async () => {
      const membership = {
        ...baseMembership,
        type: 'CONTINUOUS_MONTHLY',
        priority: 1,
        classesTotal: null,
        classesRemaining: null,
        expiresAt: new Date('2026-01-31T00:00:00.000Z'),
      }
      mockCreate.mockResolvedValue(membership as never)

      await createMembership('user_1', 'CONTINUOUS_MONTHLY')

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CONTINUOUS_MONTHLY',
          priority: 1,
          classesTotal: null,
          classesRemaining: null,
          expiresAt: new Date('2026-01-31T00:00:00.000Z'),
        }),
      })
    })

    it('creates a YEARLY membership with priority 1 and expiresAt 365 days from now', async () => {
      const membership = {
        ...baseMembership,
        type: 'YEARLY',
        priority: 1,
        classesTotal: null,
        classesRemaining: null,
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      }
      mockCreate.mockResolvedValue(membership as never)

      await createMembership('user_1', 'YEARLY')

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'YEARLY',
          priority: 1,
          classesTotal: null,
          classesRemaining: null,
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
        }),
      })
    })
  })

  it('creates a CLASS_PACK_5 with priority 2, classesTotal/Remaining 5, and no expiresAt', async () => {
    const membership = {
      ...baseMembership,
      type: 'CLASS_PACK_5',
      priority: 2,
      classesTotal: 5,
      classesRemaining: 5,
      expiresAt: null,
    }
    mockCreate.mockResolvedValue(membership as never)

    await createMembership('user_1', 'CLASS_PACK_5')

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CLASS_PACK_5',
        priority: 2,
        classesTotal: 5,
        classesRemaining: 5,
        expiresAt: null,
      }),
    })
  })

  it('creates a CLASS_PACK_10 with classesTotal/Remaining 10', async () => {
    const membership = {
      ...baseMembership,
      type: 'CLASS_PACK_10',
      priority: 2,
      classesTotal: 10,
      classesRemaining: 10,
      expiresAt: null,
    }
    mockCreate.mockResolvedValue(membership as never)

    await createMembership('user_1', 'CLASS_PACK_10')

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CLASS_PACK_10',
        classesTotal: 10,
        classesRemaining: 10,
      }),
    })
  })

  it('creates a DROP_IN with priority 2, classesTotal/Remaining 1, and no expiresAt', async () => {
    const membership = {
      ...baseMembership,
      type: 'DROP_IN',
      priority: 2,
      classesTotal: 1,
      classesRemaining: 1,
      expiresAt: null,
    }
    mockCreate.mockResolvedValue(membership as never)

    await createMembership('user_1', 'DROP_IN')

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'DROP_IN',
        priority: 2,
        classesTotal: 1,
        classesRemaining: 1,
        expiresAt: null,
      }),
    })
  })
})

describe('NotificationJob creation', () => {
  const frozenNow = new Date('2026-01-01T00:00:00.000Z')
  const monthlyMembership = {
    ...baseMembership,
    type: 'MONTHLY' as const,
    priority: 1,
    classesTotal: null,
    classesRemaining: null,
    expiresAt: new Date('2026-01-31T00:00:00.000Z'),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(frozenNow)
    mockCreate.mockResolvedValue(monthlyMembership as never)
    mockTriggerFindMany.mockResolvedValue([])
    mockJobCreateMany.mockResolvedValue({ count: 0 } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates no jobs when there are no active triggers', async () => {
    await createMembership('user_1', 'MONTHLY')

    expect(mockJobCreateMany).not.toHaveBeenCalled()
  })

  it('creates an AFTER_PURCHASE job with triggerAt = now + offsetDays', async () => {
    mockTriggerFindMany.mockResolvedValue([
      { id: 'trig_1', triggerEvent: 'AFTER_PURCHASE', offsetDays: 7 },
    ] as never)

    await createMembership('user_1', 'MONTHLY')

    expect(mockJobCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user_1',
          membershipId: baseMembership.id,
          triggerId: 'trig_1',
          triggerAt: new Date('2026-01-08T00:00:00.000Z'),
        },
      ],
    })
  })

  it('creates a MEMBERSHIP_EXPIRING job with triggerAt = expiresAt - offsetDays', async () => {
    mockTriggerFindMany.mockResolvedValue([
      { id: 'trig_2', triggerEvent: 'MEMBERSHIP_EXPIRING', offsetDays: 3 },
    ] as never)

    await createMembership('user_1', 'MONTHLY')

    expect(mockJobCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user_1',
          membershipId: baseMembership.id,
          triggerId: 'trig_2',
          triggerAt: new Date('2026-01-28T00:00:00.000Z'),
        },
      ],
    })
  })

  it('creates a MEMBERSHIP_EXPIRED job with triggerAt = expiresAt + offsetDays', async () => {
    mockTriggerFindMany.mockResolvedValue([
      { id: 'trig_3', triggerEvent: 'MEMBERSHIP_EXPIRED', offsetDays: 0 },
    ] as never)

    await createMembership('user_1', 'MONTHLY')

    expect(mockJobCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user_1',
          membershipId: baseMembership.id,
          triggerId: 'trig_3',
          triggerAt: new Date('2026-01-31T00:00:00.000Z'),
        },
      ],
    })
  })

  it('skips MEMBERSHIP_EXPIRING and MEMBERSHIP_EXPIRED triggers when membership has no expiresAt', async () => {
    mockCreate.mockResolvedValue({
      ...baseMembership,
      type: 'CLASS_PACK_5',
      priority: 2,
      classesTotal: 5,
      classesRemaining: 5,
      expiresAt: null,
    } as never)
    mockTriggerFindMany.mockResolvedValue([
      { id: 'trig_2', triggerEvent: 'MEMBERSHIP_EXPIRING', offsetDays: 3 },
      { id: 'trig_3', triggerEvent: 'MEMBERSHIP_EXPIRED', offsetDays: 0 },
    ] as never)

    await createMembership('user_1', 'CLASS_PACK_5')

    expect(mockJobCreateMany).not.toHaveBeenCalled()
  })

  it('creates jobs for multiple matching triggers in one createMany call', async () => {
    mockTriggerFindMany.mockResolvedValue([
      { id: 'trig_1', triggerEvent: 'AFTER_PURCHASE', offsetDays: 7 },
      { id: 'trig_2', triggerEvent: 'MEMBERSHIP_EXPIRING', offsetDays: 3 },
    ] as never)

    await createMembership('user_1', 'MONTHLY')

    expect(mockJobCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ triggerId: 'trig_1' }),
        expect.objectContaining({ triggerId: 'trig_2' }),
      ]),
    })
    expect(mockJobCreateMany).toHaveBeenCalledTimes(1)
  })
})

describe('listMemberships', () => {
  it('returns all memberships for the user ordered by createdAt desc', async () => {
    const memberships = [
      {
        ...baseMembership,
        id: 'mem_1',
        type: 'MONTHLY',
        priority: 1,
        classesTotal: null,
        classesRemaining: null,
        expiresAt: new Date(),
      },
      {
        ...baseMembership,
        id: 'mem_2',
        type: 'CLASS_PACK_5',
        priority: 2,
        classesTotal: 5,
        classesRemaining: 3,
        expiresAt: null,
      },
    ]
    mockFindMany.mockResolvedValue(memberships as never)

    const result = await listMemberships('user_1')

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
    })
    expect(result).toEqual(memberships)
  })

  it('returns an empty array when the user has no memberships', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await listMemberships('user_1')

    expect(result).toEqual([])
  })
})

describe('getMembership', () => {
  const membershipWithTransactions = {
    ...baseMembership,
    type: 'MONTHLY',
    priority: 1,
    classesTotal: null,
    classesRemaining: null,
    expiresAt: new Date(),
    membershipTransactions: [],
  }

  it('returns the membership with transactions when requester is the owner', async () => {
    mockFindUnique.mockResolvedValue(membershipWithTransactions as never)

    const result = await getMembership('mem_1', 'user_1', false)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      include: { membershipTransactions: true },
    })
    expect(result).toEqual(membershipWithTransactions)
  })

  it('returns the membership when requester is an admin', async () => {
    mockFindUnique.mockResolvedValue(membershipWithTransactions as never)

    const result = await getMembership('mem_1', 'other_user', true)

    expect(result).toEqual(membershipWithTransactions)
  })

  it('throws NotFoundError when the membership does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(getMembership('nonexistent', 'user_1', false)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the owner and not admin', async () => {
    mockFindUnique.mockResolvedValue(membershipWithTransactions as never)

    await expect(getMembership('mem_1', 'other_user', false)).rejects.toThrow(ForbiddenError)
  })
})

describe('getValidMembership', () => {
  it('returns null when the user has no active non-expired memberships', async () => {
    mockFindMany.mockResolvedValue([])

    const result = await getValidMembership('user_1')

    expect(result).toBeNull()
  })

  it('queries only ACTIVE memberships that are not expired', async () => {
    mockFindMany.mockResolvedValue([])

    await getValidMembership('user_1')

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_1',
          status: 'ACTIVE',
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        }),
      })
    )
  })

  it('returns the first membership in the ordered list when it is a time-based membership', async () => {
    const monthly = {
      ...baseMembership,
      type: 'MONTHLY',
      priority: 1,
      classesRemaining: null,
      expiresAt: new Date(),
    }
    const pack = {
      ...baseMembership,
      id: 'mem_2',
      type: 'CLASS_PACK_5',
      priority: 2,
      classesRemaining: 5,
      expiresAt: null,
    }
    mockFindMany.mockResolvedValue([monthly, pack] as never)

    const result = await getValidMembership('user_1')

    expect(result).toEqual(monthly)
  })

  it('skips a pack with classesRemaining === 0 and returns the next valid membership', async () => {
    const exhaustedPack = {
      ...baseMembership,
      type: 'CLASS_PACK_5',
      priority: 2,
      classesRemaining: 0,
      expiresAt: null,
    }
    const validPack = {
      ...baseMembership,
      id: 'mem_2',
      type: 'CLASS_PACK_10',
      priority: 2,
      classesRemaining: 3,
      expiresAt: null,
    }
    mockFindMany.mockResolvedValue([exhaustedPack, validPack] as never)

    const result = await getValidMembership('user_1')

    expect(result).toEqual(validPack)
  })

  it('returns null when the only membership is a pack with classesRemaining === 0', async () => {
    const exhaustedPack = {
      ...baseMembership,
      type: 'DROP_IN',
      priority: 2,
      classesRemaining: 0,
      expiresAt: null,
    }
    mockFindMany.mockResolvedValue([exhaustedPack] as never)

    const result = await getValidMembership('user_1')

    expect(result).toBeNull()
  })
})

describe('updateMembership', () => {
  const existingMembership = {
    ...baseMembership,
    type: 'CLASS_PACK_10' as const,
    priority: 2,
    classesTotal: 10,
    classesRemaining: 8,
    expiresAt: null,
  }

  beforeEach(() => {
    mockFindUnique.mockResolvedValue(existingMembership as never)
    mockUpdate.mockResolvedValue(existingMembership as never)
    mockTransactionCreate.mockResolvedValue({} as never)
  })

  it('throws NotFoundError when the membership does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(updateMembership('mem_1', { status: 'PAUSED' })).rejects.toThrow(NotFoundError)
  })

  it('updates status to PAUSED without writing a MembershipTransaction', async () => {
    await updateMembership('mem_1', { status: 'PAUSED' })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { status: 'PAUSED' },
    })
    expect(mockTransactionCreate).not.toHaveBeenCalled()
  })

  it('updates status to CANCELLED without writing a MembershipTransaction', async () => {
    await updateMembership('mem_1', { status: 'CANCELLED' })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { status: 'CANCELLED' },
    })
    expect(mockTransactionCreate).not.toHaveBeenCalled()
  })

  it('adjusting classesRemaining writes a MembershipTransaction with correct delta and balanceAfter', async () => {
    await updateMembership('mem_1', { classesRemaining: 5 })

    expect(mockTransactionCreate).toHaveBeenCalledWith({
      data: {
        membershipId: 'mem_1',
        delta: -3,
        balanceAfter: 5,
        note: 'Admin adjustment',
      },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { classesRemaining: 5 },
    })
  })

  it('adjusting classesRemaining upward writes a positive delta', async () => {
    await updateMembership('mem_1', { classesRemaining: 10 })

    expect(mockTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ delta: 2, balanceAfter: 10 }),
    })
  })

  it('can update both status and classesRemaining together', async () => {
    await updateMembership('mem_1', { status: 'PAUSED', classesRemaining: 3 })

    expect(mockTransactionCreate).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { status: 'PAUSED', classesRemaining: 3 },
    })
  })

  it('does not commit MembershipTransaction when membership.update fails', async () => {
    mockUpdate.mockRejectedValue(new Error('DB error'))

    await expect(updateMembership('mem_1', { classesRemaining: 5 })).rejects.toThrow('DB error')
    expect(mockTransactionCreate).toHaveBeenCalled()
  })

  it('does not write a MembershipTransaction when classesRemaining is unchanged', async () => {
    await updateMembership('mem_1', { classesRemaining: 8 })

    expect(mockTransactionCreate).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('throws ValidationError when adjusting classesRemaining on a time-based membership', async () => {
    mockFindUnique.mockResolvedValue({
      ...existingMembership,
      type: 'MONTHLY',
      classesTotal: null,
      classesRemaining: null,
    } as never)

    await expect(updateMembership('mem_1', { classesRemaining: 5 })).rejects.toThrow(ValidationError)
  })
})

describe('cancelMembership', () => {
  const continuousMonthly = {
    ...baseMembership,
    type: 'CONTINUOUS_MONTHLY' as const,
    priority: 1,
    classesTotal: null,
    classesRemaining: null,
    expiresAt: new Date('2026-05-21T00:00:00.000Z'),
  }

  beforeEach(() => {
    mockFindUnique.mockResolvedValue(continuousMonthly as never)
    mockUpdate.mockResolvedValue({ ...continuousMonthly, status: 'CANCELLED' } as never)
  })

  it('throws NotFoundError when the membership does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(cancelMembership('mem_1', 'user_1')).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when the requester is not the owner', async () => {
    await expect(cancelMembership('mem_1', 'other_user')).rejects.toThrow(ForbiddenError)
  })

  it('throws ValidationError when the membership type is not CONTINUOUS_MONTHLY', async () => {
    mockFindUnique.mockResolvedValue({ ...continuousMonthly, type: 'MONTHLY' } as never)

    await expect(cancelMembership('mem_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when the membership is not ACTIVE', async () => {
    mockFindUnique.mockResolvedValue({ ...continuousMonthly, status: 'CANCELLED' } as never)

    await expect(cancelMembership('mem_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('sets status to CANCELLED for a valid owned CONTINUOUS_MONTHLY membership', async () => {
    const result = await cancelMembership('mem_1', 'user_1')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'mem_1' },
      data: { status: 'CANCELLED' },
    })
    expect(result.status).toBe('CANCELLED')
  })
})
