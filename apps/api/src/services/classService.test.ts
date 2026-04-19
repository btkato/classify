import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { createClass, listClasses, getClass } from './classService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    class: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

const mockCreate = vi.mocked(prisma.class.create)
const mockFindMany = vi.mocked(prisma.class.findMany)
const mockFindUnique = vi.mocked(prisma.class.findUnique)

beforeEach(() => {
  vi.clearAllMocks()
})

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now

const validInput = {
  instructorId: 'user_1',
  categoryId: 'cat_1',
  title: 'Morning Yoga',
  capacity: 10,
  startsAt: futureDate,
  durationMinutes: 60,
}

describe('createClass', () => {
  it('calls prisma.class.create with the given input and returns the result', async () => {
    const createdClass = {
      id: 'class_1',
      ...validInput,
      description: null,
      location: null,
      recurringGroupId: null,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockCreate.mockResolvedValue(createdClass as never)

    const result = await createClass(validInput)

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        instructorId: validInput.instructorId,
        categoryId: validInput.categoryId,
        title: validInput.title,
        description: undefined,
        capacity: validInput.capacity,
        startsAt: validInput.startsAt,
        durationMinutes: validInput.durationMinutes,
        location: undefined,
        recurringGroupId: undefined,
      },
    })
    expect(result).toEqual(createdClass)
  })

  it('throws a ValidationError when startsAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60)

    await expect(
      createClass({ ...validInput, startsAt: pastDate })
    ).rejects.toThrow('Class must start in the future')

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('throws a ValidationError when startsAt is right now', async () => {
    const now = new Date()

    await expect(
      createClass({ ...validInput, startsAt: now })
    ).rejects.toThrow('Class must start in the future')

    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('listClasses', () => {
  it('queries ACTIVE classes with startsAt >= now when no filters provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({})

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          startsAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
        orderBy: { startsAt: 'asc' },
      })
    )
  })

  it('includes categoryId in the where clause when provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ categoryId: 'cat_1' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: 'cat_1',
        }),
      })
    )
  })

  it('includes startsAt lte in the where clause when to is provided', async () => {
    const toDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 days from now
    mockFindMany.mockResolvedValue([])

    await listClasses({ to: toDate })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startsAt: expect.objectContaining({ lte: toDate }),
        }),
      })
    )
  })

  it('uses provided from date instead of now when from is provided', async () => {
    const fromDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) // 2 days from now
    mockFindMany.mockResolvedValue([])

    await listClasses({ from: fromDate })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startsAt: expect.objectContaining({ gte: fromDate }),
        }),
      })
    )
  })

  it('returns the results from prisma', async () => {
    const classes = [
      { id: 'class_1', title: 'Morning Yoga', startsAt: futureDate },
      { id: 'class_2', title: 'Evening Pilates', startsAt: futureDate },
    ]
    mockFindMany.mockResolvedValue(classes as never)

    const result = await listClasses({})

    expect(result).toEqual(classes)
  })
})

describe('getClass', () => {
  it('returns the class when found', async () => {
    const foundClass = { id: 'class_1', title: 'Morning Yoga' }
    mockFindUnique.mockResolvedValue(foundClass as never)

    const result = await getClass('class_1')

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'class_1' } })
    expect(result).toEqual(foundClass)
  })

  it('throws NotFoundError when the class does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(getClass('nonexistent')).rejects.toThrow('Class not found')

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'nonexistent' } })
  })
})
