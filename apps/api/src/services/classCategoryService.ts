import { prisma } from '../lib/prisma.js'
import type { ClassCategory } from 'db'

export async function createCategory(name: string): Promise<ClassCategory> {
  return prisma.classCategory.create({ data: { name } })
}

export async function listCategories(): Promise<ClassCategory[]> {
  return prisma.classCategory.findMany({ orderBy: { name: 'asc' } })
}
