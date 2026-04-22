import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import {
  createLessonSet,
  listLessonSets,
  getLessonSet,
  updateLessonSet,
  cancelLessonSet,
  cancelLessonSetRegistration,
  enrollInLessonSet,
} from './lessonSetService.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'

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
      groupBy: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
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
const mockRegistrationGroupBy = vi.mocked(prisma.registration.groupBy)
const mockRegistrationCreate = vi.mocked(prisma.registration.create)
const mockRegistrationFindFirst = vi.mocked(prisma.registration.findFirst)
const mockRegistrationFindMany = vi.mocked(prisma.registration.findMany)
const mockRegistrationUpdate = vi.mocked(prisma.registration.update)
const mockRegistrationUpdateMany = vi.mocked(prisma.registration.updateMany)
const mockMembershipFindMany = vi.mocked(prisma.membership.findMany)
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

    const session2Date = new Date(futureDate.getTime() + validInput.intervalDays * msPerDay)
    const session3Date = new Date(futureDate.getTime() + 2 * validInput.intervalDays * msPerDay)
    expect(mockClassCreate).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ startsAt: session2Date }) })
    expect(mockClassCreate).toHaveBeenNthCalledWith(3, { data: expect.objectContaining({ startsAt: session3Date }) })
  })

  it('sets the first session startsAt to firstSessionStartsAt', async () => {
    await createLessonSet(validInput)

    expect(mockClassCreate).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ startsAt: validInput.firstSessionStartsAt }) })
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

    expect(mockClassCreate).toHaveBeenNthCalledWith(2, { data: expect.objectContaining({ startsAt: overrideDate }) })
  })

  it('applies a location override for the specified session', async () => {
    await createLessonSet({
      ...validInput,
      sessionOverrides: [{ sessionNumber: 3, location: 'Studio B' }],
    })

    expect(mockClassCreate).toHaveBeenNthCalledWith(3, { data: expect.objectContaining({ location: 'Studio B' }) })
    expect(mockClassCreate).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ location: undefined }) })
  })

  it('non-overridden sessions keep the default cadence date', async () => {
    const overrideDate = new Date(futureDate.getTime() + 2 * msPerDay)
    await createLessonSet({
      ...validInput,
      sessionOverrides: [{ sessionNumber: 2, startsAt: overrideDate }],
    })

    const session3Date = new Date(futureDate.getTime() + 2 * validInput.intervalDays * msPerDay)
    expect(mockClassCreate).toHaveBeenNthCalledWith(1, { data: expect.objectContaining({ startsAt: validInput.firstSessionStartsAt }) })
    expect(mockClassCreate).toHaveBeenNthCalledWith(3, { data: expect.objectContaining({ startsAt: session3Date }) })
  })

  it('returns the created lesson set', async () => {
    const result = await createLessonSet(validInput)

    expect(result).toEqual(lessonSetRecord)
  })
})

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

describe('cancelLessonSet', () => {
  it('cancels the lesson set and all its classes inside a transaction', async () => {
    mockLessonSetUpdate.mockResolvedValue({ ...lessonSetRecord, status: 'CANCELLED' } as never)
    mockClassUpdateMany.mockResolvedValue({ count: 3 } as never)

    await cancelLessonSet('ls_1')

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

    const result = await cancelLessonSet('ls_1')

    expect(result).toEqual(cancelled)
  })
})

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
        { id: 'reg_1', classId: 'cls_1', status: 'ENROLLED', membershipId: null, membership: null,
          class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', status: 'ENROLLED', membershipId: null, membership: null,
          class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledTimes(2)
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_2' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    })

    it('refunds pack credits for each registration backed by a pack membership', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 4, classesTotal: 5 }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledOnce()
      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { classesRemaining: { increment: 2 } },
      })
      expect(mockMembershipTransactionCreate).toHaveBeenCalledTimes(2)
    })

    it('cancels WAITLISTED registrations for the student', async () => {
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'WAITLISTED', waitlistPosition: 2,
          membershipId: null, membership: null, class: { startsAt: session1StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    })

    it('compacts the waitlist when cancelling a WAITLISTED registration', async () => {
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'WAITLISTED', waitlistPosition: 2,
          membershipId: null, membership: null, class: { startsAt: session1StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdateMany).toHaveBeenCalledWith({
        where: { classId: 'cls_1', status: 'WAITLISTED', waitlistPosition: { gt: 2 } },
        data: { waitlistPosition: { decrement: 1 } },
      })
    })

    it('does not refund credits for a WAITLISTED registration backed by a pack', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 4, classesTotal: 5 }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'WAITLISTED', waitlistPosition: 1,
          membershipId: 'mem_1', membership: packMembership, class: { startsAt: session1StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })

    it('issues a single membership increment for all sessions on the same membership', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 4, classesTotal: 5 }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledOnce()
      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { classesRemaining: { increment: 2 } },
      })
    })

    it('computes balanceAfter as baseBalance + (index + 1) for each transaction', async () => {
      const packMembership = { id: 'mem_1', classesRemaining: 4, classesTotal: 5 }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session1StartsAt } },
        { id: 'reg_2', classId: 'cls_2', status: 'ENROLLED', membershipId: 'mem_1',
          membership: packMembership, class: { startsAt: session2StartsAt } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockMembershipTransactionCreate).toHaveBeenNthCalledWith(1,
        expect.objectContaining({ data: expect.objectContaining({ balanceAfter: 5 }) })
      )
      expect(mockMembershipTransactionCreate).toHaveBeenNthCalledWith(2,
        expect.objectContaining({ data: expect.objectContaining({ balanceAfter: 6 }) })
      )
    })

    it('does not write a refund for a time-based membership', async () => {
      const timeMembership = { id: 'mem_2', classesRemaining: null, classesTotal: null }
      const registrations = [
        { id: 'reg_1', classId: 'cls_1', status: 'ENROLLED', membershipId: 'mem_2',
          membership: timeMembership, class: { startsAt: session1StartsAt } },
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
        data: { status: 'CANCELLED', waitlistPosition: null },
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

    it('cancels WAITLISTED registrations for future sessions and compacts the waitlist', async () => {
      const registrations = [
        { id: 'reg_1', classId: 'cls_2', status: 'WAITLISTED', waitlistPosition: 1,
          membershipId: null, membership: null, class: { startsAt: futureSession } },
      ]
      mockRegistrationFindMany.mockResolvedValue(registrations as never)

      await cancelLessonSetRegistration('ls_1', 'user_1')

      expect(mockRegistrationUpdateMany).toHaveBeenCalledWith({
        where: { classId: 'cls_2', status: 'WAITLISTED', waitlistPosition: { gt: 1 } },
        data: { waitlistPosition: { decrement: 1 } },
      })
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
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

describe('enrollInLessonSet', () => {
  const session1StartsAt = new Date(Date.now() + 7 * msPerDay)
  const session2StartsAt = new Date(Date.now() + 14 * msPerDay)

  const sessions = [
    { id: 'cls_1', sessionNumber: 1, startsAt: session1StartsAt, capacity: 10 },
    { id: 'cls_2', sessionNumber: 2, startsAt: session2StartsAt, capacity: 10 },
  ]

  const fullSetWithSessions = { ...lessonSetRecord, enrollmentType: 'FULL_SET', classes: sessions }

  const timeMembership = {
    id: 'mem_1',
    userId: 'user_1',
    type: 'MONTHLY',
    status: 'ACTIVE',
    priority: 1,
    classesRemaining: null,
    classesTotal: null,
    expiresAt: new Date(Date.now() + 30 * msPerDay),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const packMembership = {
    id: 'mem_2',
    userId: 'user_1',
    type: 'CLASS_PACK_5',
    status: 'ACTIVE',
    priority: 2,
    classesRemaining: 5,
    classesTotal: 5,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('throws NotFoundError when the lesson set does not exist', async () => {
    mockLessonSetFindUnique.mockResolvedValue(null)

    await expect(enrollInLessonSet('nonexistent', 'user_1')).rejects.toThrow(NotFoundError)
  })

  it('throws ValidationError when the lesson set is DROP_IN', async () => {
    mockLessonSetFindUnique.mockResolvedValue({
      ...fullSetWithSessions,
      enrollmentType: 'DROP_IN',
    } as never)

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when the lesson set is not ACTIVE', async () => {
    mockLessonSetFindUnique.mockResolvedValue({
      ...fullSetWithSessions,
      status: 'CANCELLED',
    } as never)

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when the lesson set has no active sessions', async () => {
    mockLessonSetFindUnique.mockResolvedValue({
      ...fullSetWithSessions,
      classes: [],
    } as never)

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when the lesson set has already started', async () => {
    const startedSessions = [
      { ...sessions[0], startsAt: new Date(Date.now() - msPerDay) },
      sessions[1],
    ]
    mockLessonSetFindUnique.mockResolvedValue(
      { ...fullSetWithSessions, classes: startedSessions } as never
    )

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when the student has no valid membership', async () => {
    mockLessonSetFindUnique.mockResolvedValue(fullSetWithSessions as never)
    mockMembershipFindMany.mockResolvedValue([])

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when a pack membership does not have enough credits for all sessions', async () => {
    const smallPack = { ...packMembership, classesRemaining: 1 }
    mockLessonSetFindUnique.mockResolvedValue(fullSetWithSessions as never)
    mockMembershipFindMany.mockResolvedValue([smallPack] as never)

    await expect(enrollInLessonSet('ls_1', 'user_1')).rejects.toThrow(ValidationError)
  })

  describe('all sessions have space', () => {
    beforeEach(() => {
      mockLessonSetFindUnique.mockResolvedValue(fullSetWithSessions as never)
      mockRegistrationGroupBy.mockResolvedValue([
        { classId: 'cls_1', _count: { _all: 5 } },
        { classId: 'cls_2', _count: { _all: 5 } },
      ] as never)
      mockRegistrationCreate.mockResolvedValueOnce({ id: 'reg_1', classId: 'cls_1', status: 'ENROLLED' } as never)
      mockRegistrationCreate.mockResolvedValueOnce({ id: 'reg_2', classId: 'cls_2', status: 'ENROLLED' } as never)
    })

    it('creates an ENROLLED registration for each session', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)

      await enrollInLessonSet('ls_1', 'user_1')

      expect(mockRegistrationCreate).toHaveBeenCalledTimes(2)
      expect(mockRegistrationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ classId: 'cls_1', status: 'ENROLLED', membershipId: 'mem_1' }),
      })
      expect(mockRegistrationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ classId: 'cls_2', status: 'ENROLLED', membershipId: 'mem_1' }),
      })
    })

    it('deducts one pack credit per enrolled session and writes a MembershipTransaction for each', async () => {
      mockMembershipFindMany.mockResolvedValue([packMembership] as never)

      await enrollInLessonSet('ls_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_2' },
        data: { classesRemaining: { decrement: 2 } },
      })
      expect(mockMembershipTransactionCreate).toHaveBeenCalledTimes(2)
    })

    it('does not deduct or write transactions for a time-based membership', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)

      await enrollInLessonSet('ls_1', 'user_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })

    it('returns all created registrations', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)

      const result = await enrollInLessonSet('ls_1', 'user_1')

      expect(result).toHaveLength(2)
    })
  })

  describe('any session is at capacity', () => {
    beforeEach(() => {
      mockLessonSetFindUnique.mockResolvedValue(fullSetWithSessions as never)
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)
      mockRegistrationGroupBy.mockResolvedValue([
        { classId: 'cls_1', _count: { _all: 10 } },
      ] as never)
      mockRegistrationFindFirst.mockResolvedValue(null)
      mockRegistrationCreate
        .mockResolvedValueOnce({ id: 'reg_1', classId: 'cls_1', status: 'WAITLISTED', waitlistPosition: 1 } as never)
        .mockResolvedValueOnce({ id: 'reg_2', classId: 'cls_2', status: 'WAITLISTED', waitlistPosition: 1 } as never)
    })

    it('creates WAITLISTED registrations for all sessions', async () => {
      await enrollInLessonSet('ls_1', 'user_1')

      expect(mockRegistrationCreate).toHaveBeenCalledTimes(2)
      for (const call of mockRegistrationCreate.mock.calls) {
        expect(call[0].data.status).toBe('WAITLISTED')
      }
    })

    it('does not deduct any membership credits when waitlisted', async () => {
      await enrollInLessonSet('ls_1', 'user_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })
  })
})
