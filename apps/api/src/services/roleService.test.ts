import { describe, it, expect, vi, beforeEach } from 'vitest'
import { grantRole, revokeRole } from './roleService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    userRole: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    instructorProfile: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockTransaction = vi.mocked(prisma.$transaction)
const mockUserRoleUpsert = vi.mocked(prisma.userRole.upsert)
const mockUserRoleDeleteMany = vi.mocked(prisma.userRole.deleteMany)
const mockInstructorProfileUpsert = vi.mocked(prisma.instructorProfile.upsert)
const mockInstructorProfileDeleteMany = vi.mocked(prisma.instructorProfile.deleteMany)

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
})

describe('grantRole', () => {
  it('creates a UserRole for the given user and role', async () => {
    await grantRole('user_123', 'STUDENT')

    expect(mockUserRoleUpsert).toHaveBeenCalledWith({
      where: { userId_role: { userId: 'user_123', role: 'STUDENT' } },
      create: { userId: 'user_123', role: 'STUDENT' },
      update: {},
    })
  })

  it('runs inside a transaction', async () => {
    await grantRole('user_123', 'STUDENT')

    expect(mockTransaction).toHaveBeenCalled()
  })

  it('also creates an InstructorProfile when granting INSTRUCTOR', async () => {
    await grantRole('user_123', 'INSTRUCTOR')

    expect(mockUserRoleUpsert).toHaveBeenCalled()
    expect(mockInstructorProfileUpsert).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
      create: { userId: 'user_123' },
      update: {},
    })
  })

  it('does not create an InstructorProfile when granting non-INSTRUCTOR roles', async () => {
    await grantRole('user_123', 'ADMIN')

    expect(mockInstructorProfileUpsert).not.toHaveBeenCalled()
  })

  it('is idempotent — granting an existing role does not throw', async () => {
    await expect(grantRole('user_123', 'STUDENT')).resolves.not.toThrow()
    await expect(grantRole('user_123', 'STUDENT')).resolves.not.toThrow()
  })
})

describe('revokeRole', () => {
  it('deletes the UserRole for the given user and role', async () => {
    await revokeRole('user_123', 'STUDENT')

    expect(mockUserRoleDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_123', role: 'STUDENT' },
    })
  })

  it('runs inside a transaction', async () => {
    await revokeRole('user_123', 'STUDENT')

    expect(mockTransaction).toHaveBeenCalled()
  })

  it('also deletes the InstructorProfile when revoking INSTRUCTOR', async () => {
    await revokeRole('user_123', 'INSTRUCTOR')

    expect(mockUserRoleDeleteMany).toHaveBeenCalled()
    expect(mockInstructorProfileDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_123' },
    })
  })

  it('does not delete an InstructorProfile when revoking non-INSTRUCTOR roles', async () => {
    await revokeRole('user_123', 'ADMIN')

    expect(mockInstructorProfileDeleteMany).not.toHaveBeenCalled()
  })
})
