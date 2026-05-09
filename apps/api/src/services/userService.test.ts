import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserById, updateProfile, adminUpdateUser, listUsers } from './userService.js'
import { NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'

const mockFindUnique = vi.mocked(prisma.user.findUnique)
const mockFindMany = vi.mocked(prisma.user.findMany)
const mockCount = vi.mocked(prisma.user.count)
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

    await expect(getUserById('user_123')).rejects.toThrow(NotFoundError)
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

  it('allows updating dateOfBirth', async () => {
    const dob = new Date('1990-01-01')
    const updated = { ...mockUser, dateOfBirth: dob }
    mockUpdate.mockResolvedValue(updated as never)

    const result = await updateProfile('user_123', { dateOfBirth: dob })

    expect(result).toEqual(updated)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user_123' },
      data: { firstName: undefined, lastName: undefined, phone: undefined, dateOfBirth: dob },
      include: { roles: true },
    })
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

describe('listUsers', () => {
  const users = [mockUser, { ...mockUser, id: 'user_456', email: 'other@example.com' }]

  beforeEach(() => {
    mockFindMany.mockResolvedValue(users as never)
    mockCount.mockResolvedValue(2 as never)
  })

  it('returns paginated users with total and page metadata', async () => {
    const result = await listUsers({ page: 1, pageSize: 10 })

    expect(result).toEqual({ data: users, total: 2, page: 1, totalPages: 1 })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10, include: { roles: true } })
    )
    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })

  it('applies skip correctly for page 2', async () => {
    await listUsers({ page: 2, pageSize: 10 })

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }))
  })

  it('filters by search term across firstName, lastName, and email', async () => {
    await listUsers({ page: 1, pageSize: 10, search: 'yoga' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { firstName: { contains: 'yoga', mode: 'insensitive' } },
                { lastName: { contains: 'yoga', mode: 'insensitive' } },
                { email: { contains: 'yoga', mode: 'insensitive' } },
              ],
            },
          ],
        },
      })
    )
  })

  it('filters by role when provided', async () => {
    await listUsers({ page: 1, pageSize: 10, role: 'INSTRUCTOR' as never })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ roles: { some: { role: 'INSTRUCTOR' } } }] },
      })
    )
  })

  it('uses empty where clause when no filters are provided', async () => {
    await listUsers({ page: 1, pageSize: 10 })

    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({ where: {} }))
  })
})
