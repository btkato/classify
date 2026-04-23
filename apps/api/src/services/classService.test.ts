import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { createClass, listClasses, getClass, updateClass, cancelClass, getRoster } from './classService.js'
import { ForbiddenError, NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    class: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

const mockCreate = vi.mocked(prisma.class.create)
const mockFindMany = vi.mocked(prisma.class.findMany)
const mockFindUnique = vi.mocked(prisma.class.findUnique)
const mockUpdate = vi.mocked(prisma.class.update)
const mockCount = vi.mocked(prisma.class.count)

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
      lessonSetId: null,
      sessionNumber: null,
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
        lessonSetId: undefined,
        sessionNumber: undefined,
        status: 'ACTIVE',
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
  beforeEach(() => {
    mockCount.mockResolvedValue(0)
  })

  it('passes no implicit defaults when called with empty input', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({})

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId: undefined,
          instructorId: undefined,
          status: undefined,
          startsAt: undefined,
        },
        orderBy: { startsAt: 'asc' },
      })
    )
  })

  it('includes categoryId in the where clause when provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ categoryId: 'cat_1' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 'cat_1' }),
      })
    )
  })

  it('includes startsAt lte in the where clause when to is provided', async () => {
    const toDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
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
    const fromDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
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

  it('returns a paginated result with data, total, page, and totalPages', async () => {
    const classes = [
      { id: 'class_1', title: 'Morning Yoga', startsAt: futureDate },
      { id: 'class_2', title: 'Evening Pilates', startsAt: futureDate },
    ]
    mockFindMany.mockResolvedValue(classes as never)
    mockCount.mockResolvedValue(2)

    const result = await listClasses({})

    expect(result).toEqual({ data: classes, total: 2, page: 1, totalPages: 1 })
  })

  it('defaults to page 1 and pageSize 10', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({})

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    )
  })

  it('skips the correct number of records for page 2', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ page: 2, pageSize: 10 })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    )
  })

  it('filters by instructorId when provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ instructorId: 'user_1' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ instructorId: 'user_1' }),
      })
    )
  })

  it('does not filter by status ACTIVE when instructorId is provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ instructorId: 'user_1' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('filters by explicit status when provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ status: 'COMPLETED' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'COMPLETED' }),
      })
    )
  })

  it('uses explicit status over the ACTIVE default when both instructorId and status are provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ instructorId: 'user_1', status: 'CANCELLED' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'CANCELLED' }),
      })
    )
  })

  it('does not set a startsAt filter when no from or to is provided', async () => {
    mockFindMany.mockResolvedValue([])

    await listClasses({ instructorId: 'user_1' })

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ startsAt: undefined }),
      })
    )
  })
})

const enrolledCountQuery = {
  where: { id: 'class_1' },
  include: {
    _count: {
      select: {
        registrations: { where: { status: 'ENROLLED' } },
      },
    },
  },
}

describe('getClass', () => {
  it('returns the class with enrolledCount when found', async () => {
    const foundClass = { id: 'class_1', title: 'Morning Yoga', _count: { registrations: 0 } }
    mockFindUnique.mockResolvedValue(foundClass as never)

    const result = await getClass('class_1')

    expect(mockFindUnique).toHaveBeenCalledWith(enrolledCountQuery)
    expect(result.enrolledCount).toBe(0)
  })

  it('returns the correct enrolledCount from registrations', async () => {
    const foundClass = { id: 'class_1', title: 'Morning Yoga', _count: { registrations: 4 } }
    mockFindUnique.mockResolvedValue(foundClass as never)

    const result = await getClass('class_1')

    expect(result.enrolledCount).toBe(4)
  })

  it('throws NotFoundError when the class does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(getClass('nonexistent')).rejects.toThrow('Class not found')

    expect(mockFindUnique).toHaveBeenCalledWith({ ...enrolledCountQuery, where: { id: 'nonexistent' } })
  })
})

describe('updateClass', () => {
  const existingClass = {
    id: 'class_1',
    instructorId: 'user_1',
    title: 'Morning Yoga',
    capacity: 10,
    startsAt: futureDate,
    durationMinutes: 60,
    status: 'ACTIVE',
    categoryId: 'cat_1',
    description: null,
    location: null,
    lessonSetId: null,
    sessionNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockFindUnique.mockResolvedValue(existingClass as never)
  })

  it('calls prisma.class.update with the given fields and returns the result', async () => {
    const updatedClass = { ...existingClass, location: 'Studio B' }
    mockUpdate.mockResolvedValue(updatedClass as never)

    const result = await updateClass('class_1', { location: 'Studio B' }, 'user_1', false)

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'class_1' },
      data: { location: 'Studio B' },
    })
    expect(result).toEqual(updatedClass)
  })

  it('throws NotFoundError when the class does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(updateClass('nonexistent', { title: 'New Title' }, 'user_1', false)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the owner and not admin', async () => {
    await expect(updateClass('class_1', { location: 'Studio B' }, 'other_user', false)).rejects.toThrow(ForbiddenError)

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('allows update when requester is not the owner but is admin', async () => {
    mockUpdate.mockResolvedValue(existingClass as never)

    await expect(updateClass('class_1', { title: 'New Title' }, 'other_user', true)).resolves.not.toThrow()

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('throws ValidationError when startsAt is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60)

    await expect(updateClass('class_1', { startsAt: pastDate }, 'user_1', true)).rejects.toThrow('Class must start in the future')

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not validate startsAt when it is not provided', async () => {
    mockUpdate.mockResolvedValue(existingClass as never)

    await expect(updateClass('class_1', { location: 'Studio B' }, 'user_1', false)).resolves.not.toThrow()

    expect(mockUpdate).toHaveBeenCalled()
  })

  describe('instructor field restrictions', () => {
    it('throws ForbiddenError when instructor tries to update title', async () => {
      await expect(updateClass('class_1', { title: 'New Title' }, 'user_1', false)).rejects.toThrow(ForbiddenError)

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('throws ForbiddenError when instructor tries to update capacity', async () => {
      await expect(updateClass('class_1', { capacity: 20 }, 'user_1', false)).rejects.toThrow(ForbiddenError)

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('throws ForbiddenError when instructor tries to update startsAt', async () => {
      await expect(updateClass('class_1', { startsAt: futureDate }, 'user_1', false)).rejects.toThrow(ForbiddenError)

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('throws ForbiddenError when instructor tries to update durationMinutes', async () => {
      await expect(updateClass('class_1', { durationMinutes: 90 }, 'user_1', false)).rejects.toThrow(ForbiddenError)

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('allows instructor to update description', async () => {
      mockUpdate.mockResolvedValue(existingClass as never)

      await expect(updateClass('class_1', { description: 'New description' }, 'user_1', false)).resolves.not.toThrow()

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('allows instructor to update location', async () => {
      mockUpdate.mockResolvedValue(existingClass as never)

      await expect(updateClass('class_1', { location: 'Studio B' }, 'user_1', false)).resolves.not.toThrow()

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('allows admin to update any field', async () => {
      mockUpdate.mockResolvedValue(existingClass as never)

      await expect(
        updateClass('class_1', { title: 'New Title', capacity: 20 }, 'other_user', true)
      ).resolves.not.toThrow()

      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})

describe('cancelClass', () => {
  const existingClass = {
    id: 'class_1',
    instructorId: 'user_1',
    title: 'Morning Yoga',
    status: 'ACTIVE',
    categoryId: 'cat_1',
    capacity: 10,
    startsAt: futureDate,
    durationMinutes: 60,
    description: null,
    location: null,
    lessonSetId: null,
    sessionNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('sets status to CANCELLED and returns the updated class', async () => {
    const cancelledClass = { ...existingClass, status: 'CANCELLED' }
    mockUpdate.mockResolvedValue(cancelledClass as never)

    const result = await cancelClass('class_1')

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'class_1' },
      data: { status: 'CANCELLED' },
    })
    expect(result.status).toBe('CANCELLED')
  })
})

describe('getRoster', () => {
  const student = {
    id: 'user_2',
    email: 'student@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
  }

  const registration = {
    id: 'reg_1',
    userId: 'user_2',
    classId: 'class_1',
    membershipId: null,
    status: 'ENROLLED',
    waitlistPosition: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: student,
  }

  const classWithRoster = {
    id: 'class_1',
    instructorId: 'user_1',
    title: 'Morning Yoga',
    status: 'ACTIVE',
    categoryId: 'cat_1',
    capacity: 10,
    startsAt: futureDate,
    durationMinutes: 60,
    description: null,
    location: null,
    lessonSetId: null,
    sessionNumber: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    registrations: [registration],
  }

  it('returns the registrations with user data when requester is the instructor', async () => {
    mockFindUnique.mockResolvedValue(classWithRoster as never)

    const result = await getRoster('class_1', 'user_1', false)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'class_1' },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { waitlistPosition: 'asc' },
        },
      },
    })
    expect(result).toEqual([registration])
  })

  it('returns the registrations when requester is an admin', async () => {
    mockFindUnique.mockResolvedValue(classWithRoster as never)

    const result = await getRoster('class_1', 'other_user', true)

    expect(result).toEqual([registration])
  })

  it('throws NotFoundError when the class does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(getRoster('nonexistent', 'user_1', false)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the instructor and not admin', async () => {
    mockFindUnique.mockResolvedValue(classWithRoster as never)

    await expect(getRoster('class_1', 'other_user', false)).rejects.toThrow(ForbiddenError)
  })

  it('orders registrations by waitlistPosition ascending', async () => {
    mockFindUnique.mockResolvedValue(classWithRoster as never)

    await getRoster('class_1', 'user_1', false)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'class_1' },
      include: {
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { waitlistPosition: 'asc' },
        },
      },
    })
  })
})
