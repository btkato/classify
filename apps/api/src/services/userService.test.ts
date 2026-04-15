import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserById, updateProfile, adminUpdateUser } from './userService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockUpdate = vi.mocked(prisma.user.update)

const mockUser = {
  id: 'user_123',
  email: 'user@example.com',
  firstName: 'User',
  lastName: 'Test',
  clerkId: 'clerk_123',
  roles: [{ role: 'STUDENT' }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserById', () => {
  it('returns user with roles when found', async () => {
    mockFindUnique.mockResolvedValue(mockUser as never)

    const result = await getUserById('user_123')

    expect(result).toEqual(mockUser)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      include: { roles: true },
    })
  })

  it('throws when user is not found', async () => {
    mockFindUnique.mockResolvedValue(null as never)

    await expect(getUserById('user_123')).rejects.toThrow('User not found')
  })
})

describe('updateProfile', () => {
  it('updates allowed profile fields', async () => {
    const updated = { ...mockUser, firstName: 'Use' }
    mockUpdate.mockResolvedValue(updated as never)

    const result = await updateProfile('user_123', { firstName: 'Use' })

    expect(result).toEqual(updated)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { firstName: 'Use' },
      include: { roles: true },
    })
  })

  it('does not allow updating email', async () => {
    mockUpdate.mockResolvedValue(mockUser as never)

    await updateProfile('user_123', { firstName: 'Brandon', email: 'hacker@evil.com' } as never)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { firstName: 'Brandon', lastName: undefined, phone: undefined },
      include: { roles: true },
    })
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'hacker@evil.com' }) })
    )
  })

  it('does not allow updating dateOfBirth', async () => {
    const dob = new Date('1990-01-01')
    mockUpdate.mockResolvedValue(mockUser as never)

    await updateProfile('user_123', { firstName: 'Brandon', dateOfBirth: dob } as never)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { firstName: 'Brandon', lastName: undefined, phone: undefined },
      include: { roles: true },
    })
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ dateOfBirth: dob }) })
    )
  })
})

describe('adminUpdateUser', () => {
  it('allows updating dateOfBirth', async () => {
    const dob = new Date('1990-01-01')
    const updated = { ...mockUser, dateOfBirth: dob }
    mockUpdate.mockResolvedValue(updated as never)

    const result = await adminUpdateUser('user_123', { dateOfBirth: dob })

    expect(result).toEqual(updated)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { dateOfBirth: dob },
      include: { roles: true },
    })
  })
})
