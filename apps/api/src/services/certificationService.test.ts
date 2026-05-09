import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import {
  listCertifications,
  createCertification,
  assignInstructorCertifications,
} from './certificationService.js'
import { NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    certification: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    instructorProfile: {
      findUnique: vi.fn(),
    },
    instructorCertification: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockCertFindMany = vi.mocked(prisma.certification.findMany)
const mockCertCreate = vi.mocked(prisma.certification.create)
const mockProfileFindUnique = vi.mocked(prisma.instructorProfile.findUnique)
const mockInstructorCertDeleteMany = vi.mocked(prisma.instructorCertification.deleteMany)
const mockInstructorCertCreateMany = vi.mocked(prisma.instructorCertification.createMany)
const mockInstructorCertFindMany = vi.mocked(prisma.instructorCertification.findMany)
const mockTransaction = vi.mocked(prisma.$transaction)

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
})

const cprCert = { id: 'cert_1', name: 'CPR', validityPeriodMonths: 12, createdAt: new Date() }
const firstAidCert = { id: 'cert_2', name: 'First Aid', validityPeriodMonths: 24, createdAt: new Date() }

describe('listCertifications', () => {
  it('returns all certifications ordered by name', async () => {
    mockCertFindMany.mockResolvedValue([cprCert, firstAidCert] as never)

    const result = await listCertifications()

    expect(mockCertFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
    expect(result).toEqual([cprCert, firstAidCert])
  })

  it('returns an empty array when no certifications exist', async () => {
    mockCertFindMany.mockResolvedValue([])

    const result = await listCertifications()

    expect(result).toEqual([])
  })
})

describe('createCertification', () => {
  it('creates and returns a certification with the given name and validity period', async () => {
    mockCertCreate.mockResolvedValue(cprCert as never)

    const result = await createCertification('CPR', 12)

    expect(mockCertCreate).toHaveBeenCalledWith({
      data: { name: 'CPR', validityPeriodMonths: 12 },
    })
    expect(result).toEqual(cprCert)
  })
})

describe('assignInstructorCertifications', () => {
  const instructorId = 'instructor_1'
  const assignments = [
    { certificationId: 'cert_1', issuedAt: new Date('2026-01-01') },
    { certificationId: 'cert_2', issuedAt: new Date('2026-01-01') },
  ]

  beforeEach(() => {
    mockProfileFindUnique.mockResolvedValue({ userId: instructorId } as never)
    mockCertFindMany.mockResolvedValue([cprCert, firstAidCert] as never)
    mockInstructorCertDeleteMany.mockResolvedValue({ count: 0 } as never)
    mockInstructorCertCreateMany.mockResolvedValue({ count: 2 } as never)
    mockInstructorCertFindMany.mockResolvedValue([] as never)
  })

  it('throws NotFoundError when the instructor profile does not exist', async () => {
    mockProfileFindUnique.mockResolvedValue(null)

    await expect(assignInstructorCertifications(instructorId, assignments)).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when a certificationId does not exist', async () => {
    mockCertFindMany.mockResolvedValue([cprCert] as never)

    await expect(assignInstructorCertifications(instructorId, assignments)).rejects.toThrow(NotFoundError)
  })

  it('deletes all existing certifications for the instructor before creating new ones', async () => {
    await assignInstructorCertifications(instructorId, assignments)

    expect(mockInstructorCertDeleteMany).toHaveBeenCalledWith({ where: { instructorId } })
  })

  it('creates new certifications with expiresAt computed from issuedAt + validityPeriodMonths', async () => {
    await assignInstructorCertifications(instructorId, assignments)

    expect(mockInstructorCertCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          instructorId,
          certificationId: 'cert_1',
          issuedAt: new Date('2026-01-01'),
          expiresAt: new Date('2027-01-01'),
        }),
        expect.objectContaining({
          instructorId,
          certificationId: 'cert_2',
          issuedAt: new Date('2026-01-01'),
          expiresAt: new Date('2028-01-01'),
        }),
      ]),
    })
  })

  it('returns the newly created certification records', async () => {
    const created = [
      { id: 'ic_1', instructorId, certificationId: 'cert_1', issuedAt: new Date('2026-01-01'), expiresAt: new Date('2027-01-01') },
    ]
    mockInstructorCertFindMany.mockResolvedValue(created as never)

    const result = await assignInstructorCertifications(instructorId, assignments)

    expect(result).toEqual(created)
  })

  it('deletes all existing certifications and skips createMany when assignments is empty', async () => {
    await assignInstructorCertifications(instructorId, [])

    expect(mockInstructorCertDeleteMany).toHaveBeenCalledWith({ where: { instructorId } })
    expect(mockInstructorCertCreateMany).not.toHaveBeenCalled()
  })
})
