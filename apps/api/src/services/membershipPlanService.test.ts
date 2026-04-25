import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { listMembershipPlans } from './membershipPlanService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    membershipPlan: {
      findMany: vi.fn(),
    },
  },
}))

const mockFindMany = vi.mocked(prisma.membershipPlan.findMany)

beforeEach(() => {
  vi.clearAllMocks()
})

const basePlan = {
  id: 'plan_1',
  stripePriceId: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listMembershipPlans', () => {
  it('queries only active plans ordered by priceInCents ascending', async () => {
    mockFindMany.mockResolvedValue([])

    await listMembershipPlans()

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { priceInCents: 'asc' },
    })
  })

  it('returns plans from the database', async () => {
    const plans = [
      { ...basePlan, id: 'plan_1', type: 'DROP_IN' as const, displayName: 'Drop-in', description: 'Single class access.', priceInCents: 2000 },
      { ...basePlan, id: 'plan_2', type: 'CLASS_PACK_5' as const, displayName: 'Class Pack (5)', description: '5 classes.', priceInCents: 8500 },
    ]
    mockFindMany.mockResolvedValue(plans)

    const result = await listMembershipPlans()

    expect(result).toEqual(plans)
  })
})
