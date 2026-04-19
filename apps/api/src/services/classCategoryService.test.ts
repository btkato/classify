import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { createCategory, listCategories } from './classCategoryService.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    classCategory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

const mockCreate = vi.mocked(prisma.classCategory.create)
const mockFindMany = vi.mocked(prisma.classCategory.findMany)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createCategory', () => {
  it('calls prisma.classCategory.create with the given name and returns the result', async () => {
    const category = { id: 'cat_1', name: 'Yoga', createdAt: new Date() }
    mockCreate.mockResolvedValue(category as never)

    const result = await createCategory('Yoga')

    expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Yoga' } })
    expect(result).toEqual(category)
  })
})

describe('listCategories', () => {
  it('returns all categories ordered by name ascending', async () => {
    const categories = [
      { id: 'cat_1', name: 'Pilates', createdAt: new Date() },
      { id: 'cat_2', name: 'Yoga', createdAt: new Date() },
    ]
    mockFindMany.mockResolvedValue(categories as never)

    const result = await listCategories()

    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
    expect(result).toEqual(categories)
  })
})
