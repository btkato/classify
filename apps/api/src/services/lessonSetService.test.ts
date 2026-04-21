import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import {
  createLessonSet,
  listLessonSets,
  getLessonSet,
  updateLessonSet,
  deleteLessonSet,
  cancelLessonSetRegistration,
} from './lessonSetService.js'
import { NotFoundError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    lessonSet: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    class: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    registration: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      update: vi.fn(),
    },
    membershipTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const mockTransaction = vi.mocked(prisma.$transaction)
const mockLessonSetCreate = vi.mocked(prisma.lessonSet.create)
const mockLessonSetFindMany = vi.mocked(prisma.lessonSet.findMany)
const mockLessonSetFindUnique = vi.mocked(prisma.lessonSet.findUnique)
const mockLessonSetUpdate = vi.mocked(prisma.lessonSet.update)
const mockClassCreate = vi.mocked(prisma.class.create)
const mockClassUpdateMany = vi.mocked(prisma.class.updateMany)
const mockRegistrationFindMany = vi.mocked(prisma.registration.findMany)
const mockRegistrationUpdate = vi.mocked(prisma.registration.update)
const mockRegistrationUpdateMany = vi.mocked(prisma.registration.updateMany)
const mockMembershipUpdate = vi.mocked(prisma.membership.update)
const mockMembershipTransactionCreate = vi.mocked(prisma.membershipTransaction.create)

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
})

const msPerDay = 1000 * 60 * 60 * 24
const futureDate = new Date(Date.now() + 7 * msPerDay)

const validInput = {
  title: 'Morning Yoga Series',
  enrollmentType: 'FULL_SET' as const,
  totalSessions: 3,
  instructorId: 'user_1',
  categoryId: 'cat_1',
  capacity: 10,
  durationMinutes: 60,
  firstSessionStartsAt: futureDate,
  intervalDays: 7,
}

const lessonSetRecord = {
  id: 'ls_1',
  title: 'Morning Yoga Series',
  description: null,
  enrollmentType: 'FULL_SET',
  totalSessions: 3,
  status: 'ACTIVE',
  instructorId: 'user_1',
  categoryId: 'cat_1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── createLessonSet ──────────────────────────────────────────────────────────

describe('createLessonSet', () => {
  beforeEach(() => {
    mockLessonSetCreate.mockResolvedValue(lessonSetRecord as never)
    mockClassCreate.mockResolvedValue({} as never)
  })

  it('creates the lesson set with correct data inside a transaction', async () => {
    await createLessonSet(validInput)

    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(mockLessonSetCreate).toHaveBeenCalledWith({
      data: {
        title: validInput.title,
        description: undefined,
        enrollmentType: validInput.enrollmentType,
        totalSessions: validInput.totalSessions,
        instructorId: validInput.instructorId,
        categoryId: validInput.categoryId,
        status: 'ACTIVE',
      },
    })
  })

  it('creates exactly totalSessions class rows', async () => {
    await createLessonSet(validInput)

    expect(mockClassCreate).toHaveBeenCalledTimes(validInput.totalSessions)
  })

  it('assigns sessionNumbers 1 through totalSessions', async () => {
    await createLessonSet(validInput)

    const sessionNumbers = mockClassCreate.mock.calls.map((c) => c[0].data.sessionNumber)
    expect(sessionNumbers).toEqual([1, 2, 3])
  })

  it('spaces sessions by intervalDays', async () => {
    await createLessonSet(validInput)

    const dates: Date[] = mockClassCreate.mock.calls.map((c) => c[0].data.startsAt)
    expect(dates[1].getTime() - dates[0].getTime()).toBe(validInput.intervalDays * msPerDay)
    expect(dates[2].getTime() - dates[1].getTime()).toBe(validInput.intervalDays * msPerDay)
  })

  it('sets the first session startsAt to firstSessionStartsAt', async () => {
    await createLessonSet(validInput)

    const firstStartsAt: Date = mockClassCreate.mock.calls[0][0].data.startsAt
    expect(firstStartsAt).toEqual(validInput.firstSessionStartsAt)
  })

  it('sets lessonSetId on every generated class', async () => {
    await createLessonSet(validInput)

    for (const call of mockClassCreate.mock.calls) {
      expect(call[0].data.lessonSetId).toBe(lessonSetRecord.id)
    }
  })

  it('applies a startsAt override for the specified session', async () => {
    const overrideDate = new Date(futureDate.getTime() + 2 * msPerDay)
    await createLessonSet({
      ...validInput,
      sessionOverrides: [{ sessionNumber: 2, startsAt: overrideDate }],
    })

    const session2StartsAt: Date = mockClassCreate.mock.calls[1][0].data.startsAt
    expect(session2StartsAt).toEqual(overrideDate)
  })

  it('applies a location override for the specified session', async () => {
    await createLessonSet({
      ...validInput,
      sessionOverrides: [{ sessionNumber: 3, location: 'Studio B' }],
    })

    expect(mockClassCreate.mock.calls[2][0].data.location).toBe('Studio B')
    expect(mockClassCreate.mock.calls[0][0].data.location).toBeUndefined()
  })

  it('non-overridden sessions keep the default cadence date', async () => {
    const overrideDate = new Date(futureDate.getTime() + 2 * msPerDay)
    await createLessonSet({
      ...validInput,
      sessionOverrides: [{ sessionNumber: 2, startsAt: overrideDate }],
    })

    const session1StartsAt: Date = mockClassCreate.mock.calls[0][0].data.startsAt
    const session3StartsAt: Date = mockClassCreate.mock.calls[2][0].data.startsAt
    expect(session1StartsAt).toEqual(validInput.firstSessionStartsAt)
    expect(session3StartsAt.getTime()).toBe(
      validInput.firstSessionStartsAt.getTime() + 2 * validInput.intervalDays * msPerDay
    )
  })

  it('returns the created lesson set', async () => {
    const result = await createLessonSet(validInput)

    expect(result).toEqual(lessonSetRecord)
  })
})

// ─── listLessonSets ───────────────────────────────────────────────────────────

describe('listLessonSets', () => {
  it('returns all lesson sets ordered by createdAt descending', async () => {
    mockLessonSetFindMany.mockResolvedValue([lessonSetRecord] as never)

    const result = await listLessonSets()

    expect(mockLessonSetFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    })
    expect(result).toEqual([lessonSetRecord])
  })
})

// ─── getLessonSet ─────────────────────────────────────────────────────────────

describe('getLessonSet', () => {
  it('returns the lesson set with sessions ordered by sessionNumber asc', async () => {
    const setWithClasses = { ...lessonSetRecord, classes: [] }
    mockLessonSetFindUnique.mockResolvedValue(setWithClasses as never)

    const result = await getLessonSet('ls_1')

    expect(mockLessonSetFindUnique).toHaveBeenCalledWith({
      where: { id: 'ls_1' },
      include: { classes: { orderBy: { sessionNumber: 'asc' } } },
    })
    expect(result).toEqual(setWithClasses)
  })

  it('throws NotFoundError when the lesson set does not exist', async () => {
    mockLessonSetFindUnique.mockResolvedValue(null)

    await expect(getLessonSet('nonexistent')).rejects.toThrow(NotFoundError)
  })
})

// ─── updateLessonSet ──────────────────────────────────────────────────────────

describe('updateLessonSet', () => {
  it('updates the lesson set and returns the result', async () => {
    const updated = { ...lessonSetRecord, title: 'Updated Title' }
    mockLessonSetUpdate.mockResolvedValue(updated as never)

    const result = await updateLessonSet('ls_1', { title: 'Updated Title' })

    expect(mockLessonSetUpdate).toHaveBeenCalledWith({
      where: { id: 'ls_1' },
      data: { title: 'Updated Title' },
    })
    expect(result).toEqual(updated)
  })
})

// ─── deleteLessonSet (admin cancel) ───────────────────────────────────────────

describe('deleteLessonSet', () => {
  it('cancels the lesson set and all its classes inside a transaction', async () => {
    mockLessonSetUpdate.mockResolvedValue({ ...lessonSetRecord, status: 'CANCELLED' } as never)
    mockClassUpdateMany.mockResolvedValue({ count: 3 } as never)

    await deleteLessonSet('ls_1')

    expect(mockTransaction).toHaveBeenCalledOnce()
    expect(mockLessonSetUpdate).toHaveBeenCalledWith({
      where: { id: 'ls_1' },
      data: { status: 'CANCELLED' },
    })
    expect(mockClassUpdateMany).toHaveBeenCalledWith({
      where: { lessonSetId: 'ls_1' },
      data: { status: 'CANCELLED' },
    })
  })

  it('returns the cancelled lesson set', async () => {
    const cancelled = { ...lessonSetRecord, status: 'CANCELLED' }
    mockLessonSetUpdate.mockResolvedValue(cancelled as never)
    mockClassUpdateMany.mockResolvedValue({ count: 3 } as never)

    const result = await deleteLessonSet('ls_1')

    expect(result).toEqual(cancelled)
  })
})

// ─── cancelLessonSetRegistration (student cancel) ────────────────────────────

describe('cancelLessonSetRegistration', () => {
  const session1StartsAt = new Date(Date.now() + 7 * msPerDay)
  const session2StartsAt = new Date(Date.now() + 14 * msPerDay)

  const classes = [
    { id: 'cls_1', sessionNumber: 1, startsAt: session1StartsAt },
    { id: 'cls_2', sessionNumber: 2, startsAt: session2StartsAt },
  ]

  const lessonSetWithClasses = { ...lessonSetRecord, classes }

  it('throws NotFoundError when the lesson set does not exist', async () => {
    mockLessonSetFindUnique.mockResolvedValue(null)

    await expect(cancelLessonSetRegistration('nonexistent', 'user_1')).rejects.toThrow(NotFoundError)
  })

  describe('lesson set has not started', () => {
    beforeEach(() => {
      mockLessonSetFindUnique.mockResolvedValue(lessonSetWithClasses as never)
    })

    it('cancels all ENROLLED registrations for the student', async () => {
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', membershipId: null, membership: null,
          class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', membershipId: null, membership: null,
          class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledTimes(2)
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED' },
      })
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_2' },
        data: { status: 'CANCELLED' },
      })
    })

    it('refunds a pack credit for each registration backed by a pack membership', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 4, classesTotal: 5 }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', membershipId: 'mem_1', membership: packMembership,
          class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', membershipId: 'mem_1', membership: packMembership,
          class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledTimes(2)
      expect(mockMembershipTransactionCreate).toHaveBeenCalledTimes(2)
      expect(mockMembershipUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mem_1' },
          data: { classesRemaining: { increment: 1 } },
        })
      )
    })

    it('does not write a refund for a time-based membership', async () => {
      const timeMembership = { id: 'mem_2', classesRemaining: null, classesTotal: null }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', membershipId: 'mem_2', membership: timeMembership,
          class: { startsAt: session1StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })
  })

  describe('lesson set has started (first session startsAt <= now)', () => {
    const pastDate = new Date(Date.now() - 2 * msPerDay)
    const futureSession = new Date(Date.now() + 5 * msPerDay)

    const startedClasses = [
      { id: 'cls_1', sessionNumber: 1, startsAt: pastDate },
      { id: 'cls_2', sessionNumber: 2, startsAt: futureSession },
    ]

    beforeEach(() => {
      mockLessonSetFindUnique.mockResolvedValue(
        { ...lessonSetRecord, classes: startedClasses } as never
      )
    })

    it('only cancels ENROLLED registrations for future sessions', async () => {
      const registrations = [
        { id: 'reg_2', classId: 'cls_2', membershipId: null, membership: null,
          class: { startsAt: futureSession } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledTimes(1)
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_2' },
        data: { status: 'CANCELLED' },
      })
    })

    it('does not issue any refund', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 3, classesTotal: 5 }
      const registrations = [
        { id: 'reg_2', classId: 'cls_2', membershipId: 'mem_1', membership: packMembership,
          class: { startsAt: futureSession } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })

    it('clears all waitlisted registrations for future sessions', async () => {
      mockRegistrationFindMany.mockResolvedValue([] as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdateMany).toHaveBeenCalledWith({
        where: {
          classId: { in: ['cls_2'] },
          status: 'WAITLISTED',
        },
        data: { status: 'CANCELLED' },
      })
    })

    it('does not call updateMany for waitlists when there are no future sessions', async () => {
      const allPastClasses = [
        { id: 'cls_1', sessionNumber: 1, startsAt: pastDate },
        { id: 'cls_2', sessionNumber: 2, startsAt: new Date(Date.now() - msPerDay) },
      ]
      mockLessonSetFindUnique.mockResolvedValue(
        { ...lessonSetRecord, classes: allPastClasses } as never
      )
      mockRegistrationFindMany.mockResolvedValue([] as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdateMany).not.toHaveBeenCalled()
    })
  })
})
