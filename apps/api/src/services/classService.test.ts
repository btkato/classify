import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { createClass } from './classService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    class: {
      create: vi.fn(),
    },
  },
}))

const mockCreate = vi.mocked(prisma.class.create)

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
