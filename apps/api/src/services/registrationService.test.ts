import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prisma } from '../lib/prisma.js'
import { enrollStudent, cancelRegistration, markAttended } from './registrationService.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    class: { findUnique: vi.fn() },
    registration: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    membershipTransaction: { create: vi.fn() },
    notificationTrigger: { findMany: vi.fn() },
    notificationJob: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

const mockClassFindUnique = vi.mocked(prisma.class.findUnique)
const mockRegistrationCount = vi.mocked(prisma.registration.count)
const mockRegistrationFindFirst = vi.mocked(prisma.registration.findFirst)
const mockRegistrationFindMany = vi.mocked(prisma.registration.findMany)
const mockRegistrationCreate = vi.mocked(prisma.registration.create)
const mockRegistrationFindUnique = vi.mocked(prisma.registration.findUnique)
const mockRegistrationUpdate = vi.mocked(prisma.registration.update)
const mockRegistrationUpdateMany = vi.mocked(prisma.registration.updateMany)
const mockMembershipFindMany = vi.mocked(prisma.membership.findMany)
const mockMembershipFindUnique = vi.mocked(prisma.membership.findUnique)
const mockMembershipUpdate = vi.mocked(prisma.membership.update)
const mockMembershipTransactionCreate = vi.mocked(prisma.membershipTransaction.create)
const mockNotificationTriggerFindMany = vi.mocked(prisma.notificationTrigger.findMany)
const mockNotificationJobCreateMany = vi.mocked(prisma.notificationJob.createMany)
const mockTransaction = vi.mocked(prisma.$transaction)

const activeClass = {
  id: 'class_1',
  status: 'ACTIVE' as const,
  capacity: 10,
}

const baseRegistration = {
  id: 'reg_1',
  userId: 'user_1',
  classId: 'class_1',
  membershipId: null,
  waitlistPosition: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const timeMembership = {
  id: 'mem_1',
  userId: 'user_1',
  type: 'MONTHLY' as const,
  status: 'ACTIVE' as const,
  priority: 1,
  classesRemaining: null,
  classesTotal: null,
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
  updatedAt: new Date(),
}

const packMembership = {
  id: 'mem_2',
  userId: 'user_1',
  type: 'CLASS_PACK_5' as const,
  status: 'ACTIVE' as const,
  priority: 2,
  classesRemaining: 3,
  classesTotal: 5,
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation(async (fn) => fn(prisma as never))
  mockRegistrationUpdateMany.mockResolvedValue({ count: 0 } as never)
})

describe('enrollStudent', () => {
  describe('class validation', () => {
    it('throws NotFoundError when the class does not exist', async () => {
      mockClassFindUnique.mockResolvedValue(null)

      await expect(enrollStudent('user_1', 'class_1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when the class is not ACTIVE', async () => {
      mockClassFindUnique.mockResolvedValue({ ...activeClass, status: 'DRAFT' } as never)
      mockRegistrationCount.mockResolvedValue(0)

      await expect(enrollStudent('user_1', 'class_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for CANCELLED class', async () => {
      mockClassFindUnique.mockResolvedValue({ ...activeClass, status: 'CANCELLED' } as never)
      mockRegistrationCount.mockResolvedValue(0)

      await expect(enrollStudent('user_1', 'class_1')).rejects.toThrow(ValidationError)
    })
  })

  describe('waitlist', () => {
    beforeEach(() => {
      mockClassFindUnique.mockResolvedValue({ ...activeClass, capacity: 2 } as never)
      mockRegistrationCount.mockResolvedValue(2)
    })

    it('creates a WAITLISTED registration with waitlistPosition = 1 when no one else is on the waitlist', async () => {
      mockRegistrationFindFirst.mockResolvedValue(null)
      mockRegistrationCreate.mockResolvedValue({
        ...baseRegistration,
        status: 'WAITLISTED',
        waitlistPosition: 1,
      } as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockRegistrationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          classId: 'class_1',
          status: 'WAITLISTED',
          waitlistPosition: 1,
        }),
      })
    })

    it('creates a WAITLISTED registration with waitlistPosition = last + 1', async () => {
      mockRegistrationFindFirst.mockResolvedValue({ waitlistPosition: 3 } as never)
      mockRegistrationCreate.mockResolvedValue({
        ...baseRegistration,
        status: 'WAITLISTED',
        waitlistPosition: 4,
      } as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockRegistrationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ waitlistPosition: 4 }),
      })
    })

    it('does not check for a valid membership when waitlisting', async () => {
      mockRegistrationFindFirst.mockResolvedValue(null)
      mockRegistrationCreate.mockResolvedValue({
        ...baseRegistration,
        status: 'WAITLISTED',
        waitlistPosition: 1,
      } as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockMembershipFindMany).not.toHaveBeenCalled()
    })
  })

  describe('enrollment', () => {
    beforeEach(() => {
      mockClassFindUnique.mockResolvedValue(activeClass as never)
      mockRegistrationCount.mockResolvedValue(5)
    })

    it('throws ValidationError when the student has no valid membership', async () => {
      mockMembershipFindMany.mockResolvedValue([])

      await expect(enrollStudent('user_1', 'class_1')).rejects.toThrow(ValidationError)
    })

    it('creates an ENROLLED registration with the membership id', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)
      mockRegistrationCreate.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        membershipId: 'mem_1',
      } as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockRegistrationCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          classId: 'class_1',
          status: 'ENROLLED',
          membershipId: 'mem_1',
        }),
      })
    })

    it('does not deduct or write a MembershipTransaction for a time-based membership', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)
      mockRegistrationCreate.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        membershipId: 'mem_1',
      } as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockMembershipUpdate).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })

    it('decrements classesRemaining and writes a MembershipTransaction for a pack-based membership', async () => {
      mockMembershipFindMany.mockResolvedValue([packMembership] as never)
      const createdReg = { ...baseRegistration, id: 'reg_new', status: 'ENROLLED', membershipId: 'mem_2' }
      mockRegistrationCreate.mockResolvedValue(createdReg as never)

      await enrollStudent('user_1', 'class_1')

      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_2' },
        data: { classesRemaining: 2 },
      })
      expect(mockMembershipTransactionCreate).toHaveBeenCalledWith({
        data: {
          membershipId: 'mem_2',
          registrationId: 'reg_new',
          delta: -1,
          balanceAfter: 2,
        },
      })
    })

    it('returns the created registration', async () => {
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)
      const expectedReg = { ...baseRegistration, status: 'ENROLLED', membershipId: 'mem_1' }
      mockRegistrationCreate.mockResolvedValue(expectedReg as never)

      const result = await enrollStudent('user_1', 'class_1')

      expect(result).toEqual(expectedReg)
    })
  })
})

describe('cancelRegistration', () => {
  describe('validation', () => {
    it('throws NotFoundError when the registration does not exist', async () => {
      mockRegistrationFindUnique.mockResolvedValue(null)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(NotFoundError)
    })

    it('throws ForbiddenError when the userId does not own the registration', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        userId: 'other_user',
      } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when the registration is already CANCELLED', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'CANCELLED',
      } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when the registration is ATTENDED', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ATTENDED',
      } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when the registration is ABSENT', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ABSENT',
      } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when the class belongs to a FULL_SET lesson set', async () => {
      mockRegistrationFindUnique.mockResolvedValue({ ...baseRegistration, status: 'ENROLLED' } as never)
      mockClassFindUnique.mockResolvedValue({ lessonSet: { enrollmentType: 'FULL_SET' } } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).rejects.toThrow(ValidationError)
    })

    it('allows cancellation when the class belongs to a DROP_IN lesson set', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        membershipId: null,
      } as never)
      mockClassFindUnique.mockResolvedValue({ lessonSet: { enrollmentType: 'DROP_IN' } } as never)
      mockRegistrationFindMany.mockResolvedValue([])
      mockRegistrationUpdate.mockResolvedValue({ ...baseRegistration, status: 'CANCELLED' } as never)

      await expect(cancelRegistration('reg_1', 'user_1')).resolves.not.toThrow()
    })
  })

  describe('cancelling a WAITLISTED registration', () => {
    beforeEach(() => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'WAITLISTED',
        waitlistPosition: 2,
      } as never)
      mockRegistrationUpdate.mockResolvedValue({
        ...baseRegistration,
        status: 'CANCELLED',
      } as never)
    })

    it('sets the registration status to CANCELLED and clears waitlistPosition', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    })

    it('renumbers waitlisted registrations with a higher position', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdateMany).toHaveBeenCalledWith({
        where: {
          classId: 'class_1',
          status: 'WAITLISTED',
          waitlistPosition: { gt: 2 },
        },
        data: { waitlistPosition: { decrement: 1 } },
      })
    })

    it('does not attempt promotion or write a MembershipTransaction', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationFindMany).not.toHaveBeenCalled()
      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })
  })

  describe('cancelling an ENROLLED registration — no waitlist', () => {
    beforeEach(() => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        membershipId: null,
      } as never)
      mockRegistrationUpdate.mockResolvedValue({
        ...baseRegistration,
        status: 'CANCELLED',
      } as never)
      mockRegistrationFindMany.mockResolvedValue([])
    })

    it('sets the registration status to CANCELLED and clears waitlistPosition', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    })

    it('does not write a MembershipTransaction when membershipId is null', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })
  })

  describe('cancelling an ENROLLED registration — with waitlist', () => {
    const waitlistedReg = {
      id: 'reg_2',
      userId: 'user_2',
      classId: 'class_1',
      status: 'WAITLISTED' as const,
      membershipId: null,
      waitlistPosition: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    beforeEach(() => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...baseRegistration,
        status: 'ENROLLED',
        membershipId: null,
      } as never)
      mockRegistrationUpdate.mockResolvedValue({ ...baseRegistration, status: 'CANCELLED' } as never)
      mockRegistrationFindMany.mockResolvedValue([waitlistedReg] as never)
      mockMembershipFindMany.mockResolvedValue([timeMembership] as never)
    })

    it('promotes the first waitlisted student with a valid membership', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_2' },
        data: { status: 'ENROLLED', waitlistPosition: null, membershipId: 'mem_1' },
      })
    })

    it('renumbers remaining waitlisted registrations after promotion', async () => {
      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdateMany).toHaveBeenCalledWith({
        where: { classId: 'class_1', status: 'WAITLISTED', waitlistPosition: { gt: 1 } },
        data: { waitlistPosition: { decrement: 1 } },
      })
    })

    it('skips a candidate with no valid membership and promotes the next', async () => {
      const secondWaitlisted = { ...waitlistedReg, id: 'reg_3', userId: 'user_3', waitlistPosition: 2 }
      mockRegistrationFindMany.mockResolvedValue([waitlistedReg, secondWaitlisted] as never)
      mockMembershipFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([timeMembership] as never)

      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_3' },
        data: { status: 'ENROLLED', waitlistPosition: null, membershipId: 'mem_1' },
      })
    })

    it('does not promote anyone when no waitlisted student has a valid membership', async () => {
      mockMembershipFindMany.mockResolvedValue([])

      await cancelRegistration('reg_1', 'user_1')

      expect(mockRegistrationUpdate).toHaveBeenCalledTimes(1)
      expect(mockRegistrationUpdate).toHaveBeenCalledWith({
        where: { id: 'reg_1' },
        data: { status: 'CANCELLED', waitlistPosition: null },
      })
    })

    it('deducts classesRemaining and writes a MembershipTransaction when the promoted student has a pack membership', async () => {
      mockMembershipFindMany.mockResolvedValue([packMembership] as never)

      await cancelRegistration('reg_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_2' },
        data: { classesRemaining: 2 },
      })
      expect(mockMembershipTransactionCreate).toHaveBeenCalledWith({
        data: {
          membershipId: 'mem_2',
          registrationId: 'reg_2',
          delta: -1,
          balanceAfter: 2,
        },
      })
    })
  })

  describe('membership refund on cancellation', () => {
    const enrolledWithPack = {
      ...baseRegistration,
      status: 'ENROLLED' as const,
      membershipId: 'mem_2',
    }

    beforeEach(() => {
      mockRegistrationFindMany.mockResolvedValue([])
      mockRegistrationUpdate.mockResolvedValue({
        ...enrolledWithPack,
        status: 'CANCELLED',
      } as never)
    })

    it('credits back classesRemaining and writes a +1 MembershipTransaction for a pack-based membership', async () => {
      mockRegistrationFindUnique.mockResolvedValue(enrolledWithPack as never)
      mockMembershipFindUnique.mockResolvedValue(packMembership as never)

      await cancelRegistration('reg_1', 'user_1')

      expect(mockMembershipUpdate).toHaveBeenCalledWith({
        where: { id: 'mem_2' },
        data: { classesRemaining: 4 },
      })
      expect(mockMembershipTransactionCreate).toHaveBeenCalledWith({
        data: {
          membershipId: 'mem_2',
          registrationId: 'reg_1',
          delta: 1,
          balanceAfter: 4,
        },
      })
    })

    it('does not write a MembershipTransaction when the membership is time-based', async () => {
      mockRegistrationFindUnique.mockResolvedValue({
        ...enrolledWithPack,
        membershipId: 'mem_1',
      } as never)
      mockMembershipFindUnique.mockResolvedValue(timeMembership as never)

      await cancelRegistration('reg_1', 'user_1')

      expect(mockMembershipTransactionCreate).not.toHaveBeenCalled()
    })
  })
})

describe('markAttended', () => {
  const enrolledRegistration = {
    ...baseRegistration,
    status: 'ENROLLED' as const,
    membershipId: 'mem_1',
    class: { instructorId: 'instructor_1' },
  }

  const attendedRegistration = { ...enrolledRegistration, status: 'ATTENDED' as const }

  beforeEach(() => {
    mockRegistrationFindUnique.mockResolvedValue(enrolledRegistration as never)
    mockRegistrationUpdate.mockResolvedValue(attendedRegistration as never)
    mockRegistrationCount.mockResolvedValue(5)
    mockNotificationTriggerFindMany.mockResolvedValue([])
  })

  it('throws NotFoundError when the registration does not exist', async () => {
    mockRegistrationFindUnique.mockResolvedValue(null)

    await expect(markAttended('reg_1', 'instructor_1', false)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when an INSTRUCTOR is not the class instructor', async () => {
    await expect(markAttended('reg_1', 'other_instructor', false)).rejects.toThrow(ForbiddenError)
  })

  it('allows an ADMIN to mark attendance for any class', async () => {
    await expect(markAttended('reg_1', 'some_admin', true)).resolves.not.toThrow()
  })

  it('throws ValidationError when the registration is not ENROLLED', async () => {
    mockRegistrationFindUnique.mockResolvedValue({ ...enrolledRegistration, status: 'WAITLISTED' } as never)

    await expect(markAttended('reg_1', 'instructor_1', false)).rejects.toThrow(ValidationError)
  })

  it('updates the registration status to ATTENDED', async () => {
    await markAttended('reg_1', 'instructor_1', false)

    expect(mockRegistrationUpdate).toHaveBeenCalledWith({
      where: { id: 'reg_1' },
      data: { status: 'ATTENDED' },
    })
  })

  it('returns the updated registration', async () => {
    const result = await markAttended('reg_1', 'instructor_1', false)

    expect(result).toEqual(attendedRegistration)
  })

  it('does not create notification jobs when no triggers match the attended count', async () => {
    mockNotificationTriggerFindMany.mockResolvedValue([])

    await markAttended('reg_1', 'instructor_1', false)

    expect(mockNotificationJobCreateMany).not.toHaveBeenCalled()
  })

  describe('notification job creation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-05-02T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates notification jobs for each matching STUDENT_LESSON_COUNT_REACHED trigger', async () => {
      mockRegistrationCount.mockResolvedValue(10)
      mockNotificationTriggerFindMany.mockResolvedValue([
        { id: 'trigger_1', offsetDays: 0, triggerEvent: 'STUDENT_LESSON_COUNT_REACHED' },
        { id: 'trigger_2', offsetDays: 3, triggerEvent: 'STUDENT_LESSON_COUNT_REACHED' },
      ] as never)

      await markAttended('reg_1', 'instructor_1', false)

      expect(mockNotificationTriggerFindMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          triggerEvent: 'STUDENT_LESSON_COUNT_REACHED',
          threshold: 10,
        },
      })
      expect(mockNotificationJobCreateMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user_1',
            membershipId: 'mem_1',
            triggerId: 'trigger_1',
            triggerAt: new Date('2026-05-02T12:00:00.000Z'),
          },
          {
            userId: 'user_1',
            membershipId: 'mem_1',
            triggerId: 'trigger_2',
            triggerAt: new Date('2026-05-05T12:00:00.000Z'),
          },
        ],
      })
    })

    it('counts ATTENDED registrations scoped to the same membership', async () => {
      await markAttended('reg_1', 'instructor_1', false)

      expect(mockRegistrationCount).toHaveBeenCalledWith({
        where: {
          userId: 'user_1',
          membershipId: 'mem_1',
          status: 'ATTENDED',
        },
      })
    })
  })
})
