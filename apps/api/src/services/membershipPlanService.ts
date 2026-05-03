import type { MembershipPlan } from 'db'
import { prisma } from '../lib/prisma.js'

export async function listMembershipPlans(): Promise<MembershipPlan[]> {
  return prisma.membershipPlan.findMany({
    where: { isActive: true },
    orderBy: { priceInCents: 'asc' },
  })
}
