import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

type TransactionClient = Prisma.TransactionClient

const admins = [
  { clerkId: 'user_seed_admin_1', email: 'admin1@classify.dev', firstName: 'Alice', lastName: 'Admin' },
  { clerkId: 'user_seed_admin_2', email: 'admin2@classify.dev', firstName: 'Bob', lastName: 'Admin' },
]

const instructors = [
  { clerkId: 'user_seed_instructor_1', email: 'instructor1@classify.dev', firstName: 'Carol', lastName: 'Coach' },
  { clerkId: 'user_seed_instructor_2', email: 'instructor2@classify.dev', firstName: 'Dan', lastName: 'Coach' },
  { clerkId: 'user_seed_instructor_3', email: 'instructor3@classify.dev', firstName: 'Eva', lastName: 'Coach' },
]

const students = [
  { clerkId: 'user_seed_student_1', email: 'student1@classify.dev', firstName: 'Frank', lastName: 'Student' },
  { clerkId: 'user_seed_student_2', email: 'student2@classify.dev', firstName: 'Grace', lastName: 'Student' },
  { clerkId: 'user_seed_student_3', email: 'student3@classify.dev', firstName: 'Hank', lastName: 'Student' },
  { clerkId: 'user_seed_student_4', email: 'student4@classify.dev', firstName: 'Iris', lastName: 'Student' },
  { clerkId: 'user_seed_student_5', email: 'student5@classify.dev', firstName: 'Jack', lastName: 'Student' },
  { clerkId: 'user_seed_student_6', email: 'student6@classify.dev', firstName: 'Karen', lastName: 'Student' },
  { clerkId: 'user_seed_student_7', email: 'student7@classify.dev', firstName: 'Leo', lastName: 'Student' },
  { clerkId: 'user_seed_student_8', email: 'student8@classify.dev', firstName: 'Mia', lastName: 'Student' },
  { clerkId: 'user_seed_student_9', email: 'student9@classify.dev', firstName: 'Nick', lastName: 'Student' },
  { clerkId: 'user_seed_student_10', email: 'student10@classify.dev', firstName: 'Olivia', lastName: 'Student' },
]

const CATEGORY_NAMES = ['Yoga', 'Pilates', 'Cycling', 'HIIT', 'Boxing', 'Dance']

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function seedUser(
  transaction: TransactionClient,
  clerkId: string,
  email: string,
  firstName: string,
  lastName: string
) {
  return transaction.user.upsert({
    where: { id: clerkId },
    create: { id: clerkId, email, firstName, lastName },
    update: {},
  })
}

async function seedRole(
  transaction: TransactionClient,
  userId: string,
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'
) {
  return transaction.userRole.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role },
    update: {},
  })
}

async function seedCategories() {
  const categoryMap = new Map<string, string>()
  for (const name of CATEGORY_NAMES) {
    const category = await prisma.classCategory.upsert({
      where: { name },
      create: { name },
      update: {},
    })
    categoryMap.set(name, category.id)
    console.log(`  Category: ${name}`)
  }
  return categoryMap
}

async function seedClasses(categoryMap: Map<string, string>) {
  const instructorId = 'user_seed_instructor_1'
  const instructor2Id = 'user_seed_instructor_2'

  const standaloneDefs = [
    {
      title: 'Morning Vinyasa Flow',
      category: 'Yoga',
      instructorId,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(2),
      durationMinutes: 60,
      capacity: 15,
      location: 'Studio A',
      description: 'A flowing sequence to wake up body and mind.',
    },
    {
      title: 'Power Core Pilates',
      category: 'Pilates',
      instructorId,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(5),
      durationMinutes: 45,
      capacity: 12,
      location: 'Studio B',
      description: 'Strengthen your core with targeted Pilates exercises.',
    },
    {
      title: 'HIIT Blast',
      category: 'HIIT',
      instructorId,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(1),
      durationMinutes: 45,
      capacity: 20,
      location: 'Main Floor',
      description: 'High-intensity interval training for all fitness levels.',
    },
    {
      title: 'Spin Cycle Challenge',
      category: 'Cycling',
      instructorId,
      status: 'DRAFT' as const,
      startsAt: daysFromNow(14),
      durationMinutes: 60,
      capacity: 20,
      location: 'Cycling Studio',
      description: null,
    },
    {
      title: 'Restorative Yoga',
      category: 'Yoga',
      instructorId,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(7),
      durationMinutes: 75,
      capacity: 10,
      location: 'Studio A',
      description: 'A slow, gentle practice to release tension and restore balance.',
    },
    {
      title: 'Boxing Fundamentals',
      category: 'Boxing',
      instructorId,
      status: 'COMPLETED' as const,
      startsAt: daysFromNow(-7),
      durationMinutes: 60,
      capacity: 10,
      location: 'Boxing Ring',
      description: 'Introduction to stance, footwork, and basic combinations.',
    },
    {
      title: 'Beginner Yoga',
      category: 'Yoga',
      instructorId,
      status: 'CANCELLED' as const,
      startsAt: daysFromNow(-3),
      durationMinutes: 60,
      capacity: 12,
      location: 'Studio A',
      description: null,
    },
    {
      title: 'Latin Dance Cardio',
      category: 'Dance',
      instructorId: instructor2Id,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(3),
      durationMinutes: 60,
      capacity: 20,
      location: 'Dance Studio',
      description: 'Salsa, merengue, and cumbia — cardio that feels like a party.',
    },
    {
      title: 'Hip Hop Fitness',
      category: 'Dance',
      instructorId: instructor2Id,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(10),
      durationMinutes: 45,
      capacity: 25,
      location: 'Dance Studio',
      description: null,
    },
    {
      title: 'Evening Spin',
      category: 'Cycling',
      instructorId: instructor2Id,
      status: 'ACTIVE' as const,
      startsAt: daysFromNow(4),
      durationMinutes: 45,
      capacity: 18,
      location: 'Cycling Studio',
      description: null,
    },
  ]

  const createdIds: string[] = []
  for (const def of standaloneDefs) {
    const created = await prisma.class.create({
      data: {
        instructorId: def.instructorId,
        categoryId: categoryMap.get(def.category)!,
        title: def.title,
        description: def.description,
        capacity: def.capacity,
        startsAt: def.startsAt,
        durationMinutes: def.durationMinutes,
        status: def.status,
        location: def.location,
      },
    })
    createdIds.push(created.id)
    console.log(`  Class: ${def.title} (${def.status})`)
  }
  return createdIds
}

async function seedLessonSets(categoryMap: Map<string, string>) {
  const instructorId = 'user_seed_instructor_1'
  const instructor2Id = 'user_seed_instructor_2'
  const yogaCategoryId = categoryMap.get('Yoga')!
  const danceCategoryId = categoryMap.get('Dance')!

  const lessonSet1 = await prisma.lessonSet.create({
    data: {
      title: 'Beginner Yoga Series',
      description: 'A 6-week introduction to yoga fundamentals — breathing, alignment, and core poses.',
      enrollmentType: 'FULL_SET',
      totalSessions: 6,
      status: 'ACTIVE',
      instructorId,
      categoryId: yogaCategoryId,
      classes: {
        create: Array.from({ length: 6 }, (_, index) => ({
          instructorId,
          categoryId: yogaCategoryId,
          title: `Beginner Yoga Series — Session ${index + 1}`,
          capacity: 12,
          startsAt: daysFromNow(7 + index * 7),
          durationMinutes: 60,
          status: 'ACTIVE' as const,
          location: 'Studio A',
          sessionNumber: index + 1,
        })),
      },
    },
  })
  console.log(`  Lesson Set: ${lessonSet1.title} (6 sessions)`)

  const lessonSet2 = await prisma.lessonSet.create({
    data: {
      title: 'Salsa Fundamentals',
      description: 'Learn the basics of salsa partnering, timing, and footwork over 4 sessions.',
      enrollmentType: 'DROP_IN',
      totalSessions: 4,
      status: 'DRAFT',
      instructorId: instructor2Id,
      categoryId: danceCategoryId,
      classes: {
        create: Array.from({ length: 4 }, (_, index) => ({
          instructorId: instructor2Id,
          categoryId: danceCategoryId,
          title: `Salsa Fundamentals — Session ${index + 1}`,
          capacity: 16,
          startsAt: daysFromNow(10 + index * 7),
          durationMinutes: 60,
          status: 'DRAFT' as const,
          location: 'Dance Studio',
          sessionNumber: index + 1,
        })),
      },
    },
  })
  console.log(`  Lesson Set: ${lessonSet2.title} (4 sessions)`)
}

async function seedMembershipPlans() {
  const plans = [
    { type: 'DROP_IN' as const, displayName: 'Drop-in', description: 'Single class access. No expiry.', priceInCents: 2000 },
    { type: 'CLASS_PACK_5' as const, displayName: 'Class Pack (5)', description: '5 classes. No expiry. $17 per class.', priceInCents: 8500 },
    { type: 'CLASS_PACK_10' as const, displayName: 'Class Pack (10)', description: '10 classes. No expiry. $16 per class.', priceInCents: 16000 },
    { type: 'MONTHLY' as const, displayName: 'Monthly', description: 'Unlimited classes. 30 days access.', priceInCents: 12000 },
    { type: 'CONTINUOUS_MONTHLY' as const, displayName: 'Continuous Monthly', description: 'Unlimited classes. Auto-renews monthly. Cancel anytime.', priceInCents: 11000 },
    { type: 'YEARLY' as const, displayName: 'Yearly', description: 'Unlimited classes. 365 days. ~$92 per month.', priceInCents: 110000 },
  ]

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { type: plan.type },
      create: plan,
      update: { displayName: plan.displayName, description: plan.description, priceInCents: plan.priceInCents },
    })
    console.log(`  Plan: ${plan.displayName} — $${(plan.priceInCents / 100).toFixed(0)}`)
  }
}

async function seedMemberships() {
  const now = new Date()

  const membershipDefs = [
    {
      userId: 'user_seed_student_1',
      type: 'MONTHLY' as const,
      status: 'ACTIVE' as const,
      expiresAt: daysFromNow(30),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_2',
      type: 'CLASS_PACK_5' as const,
      status: 'ACTIVE' as const,
      expiresAt: null,
      classesRemaining: 3,
      classesTotal: 5,
      priority: 2,
    },
    {
      userId: 'user_seed_student_3',
      type: 'YEARLY' as const,
      status: 'ACTIVE' as const,
      expiresAt: daysFromNow(365),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_4',
      type: 'CLASS_PACK_10' as const,
      status: 'EXHAUSTED' as const,
      expiresAt: null,
      classesRemaining: 0,
      classesTotal: 10,
      priority: 2,
    },
    {
      userId: 'user_seed_student_5',
      type: 'MONTHLY' as const,
      status: 'EXPIRED' as const,
      expiresAt: daysFromNow(-7),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_6',
      type: 'DROP_IN' as const,
      status: 'ACTIVE' as const,
      expiresAt: daysFromNow(1),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_7',
      type: 'CONTINUOUS_MONTHLY' as const,
      status: 'ACTIVE' as const,
      expiresAt: daysFromNow(30),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_8',
      type: 'CLASS_PACK_5' as const,
      status: 'CANCELLED' as const,
      expiresAt: null,
      classesRemaining: 2,
      classesTotal: 5,
      priority: 2,
    },
    {
      userId: 'user_seed_student_9',
      type: 'YEARLY' as const,
      status: 'ACTIVE' as const,
      expiresAt: daysFromNow(180),
      classesRemaining: null,
      classesTotal: null,
      priority: 1,
    },
    {
      userId: 'user_seed_student_10',
      type: 'CLASS_PACK_10' as const,
      status: 'ACTIVE' as const,
      expiresAt: null,
      classesRemaining: 7,
      classesTotal: 10,
      priority: 2,
    },
  ]

  for (const def of membershipDefs) {
    await prisma.membership.create({ data: def })
    console.log(`  Membership: ${def.type} (${def.status}) for ${def.userId}`)
  }

  void now
}

async function seedRegistrations(standaloneClassIds: string[]) {
  // Enroll students 1–4 in "Morning Vinyasa Flow" (index 0)
  // Student 5 is waitlisted
  const morningYogaId = standaloneClassIds[0]
  const hiitBlastId = standaloneClassIds[2]

  if (!morningYogaId || !hiitBlastId) return

  const enrolledStudents = [
    'user_seed_student_1',
    'user_seed_student_2',
    'user_seed_student_3',
    'user_seed_student_4',
  ]
  for (const userId of enrolledStudents) {
    await prisma.registration.create({
      data: { userId, classId: morningYogaId, status: 'ENROLLED' },
    })
  }
  await prisma.registration.create({
    data: {
      userId: 'user_seed_student_5',
      classId: morningYogaId,
      status: 'WAITLISTED',
      waitlistPosition: 1,
    },
  })
  console.log(`  Registrations: 4 enrolled + 1 waitlisted in Morning Vinyasa Flow`)

  // Enroll students 2–3 in "HIIT Blast" (index 2)
  for (const userId of ['user_seed_student_2', 'user_seed_student_3']) {
    await prisma.registration.create({
      data: { userId, classId: hiitBlastId, status: 'ENROLLED' },
    })
  }
  console.log(`  Registrations: 2 enrolled in HIIT Blast`)
}

async function seedMessages(standaloneClassIds: string[]) {
  const adminId = 'user_seed_admin_1'
  const instructorId = 'user_seed_instructor_1'
  const morningYogaId = standaloneClassIds[0]

  // DIRECT thread: Alice Admin ↔ Carol Coach
  const directThread = await prisma.messageThread.create({
    data: { type: 'DIRECT' },
  })
  await prisma.threadParticipant.createMany({
    data: [
      { threadId: directThread.id, userId: adminId, canReply: true },
      { threadId: directThread.id, userId: instructorId, canReply: true },
    ],
  })
  const directMessage1 = await prisma.message.create({
    data: {
      threadId: directThread.id,
      senderId: adminId,
      body: 'Hi Carol, just checking in — how are the Morning Vinyasa enrolments looking?',
      sentAt: new Date(Date.now() - 60 * 60 * 1000 * 2),
      readAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  })
  const directMessage2 = await prisma.message.create({
    data: {
      threadId: directThread.id,
      senderId: instructorId,
      body: 'All good! Four enrolled and one on the waitlist. Happy to take a couple more if you can raise capacity.',
      sentAt: new Date(Date.now() - 60 * 60 * 1000),
      readAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  })
  const directMessage3 = await prisma.message.create({
    data: {
      threadId: directThread.id,
      senderId: adminId,
      body: "I'll bump it to 17 — let me know if you need anything else before the session.",
      sentAt: new Date(),
      readAt: null,
    },
  })
  await prisma.messageThread.update({
    where: { id: directThread.id },
    data: { lastMessageAt: directMessage3.sentAt },
  })
  console.log(`  Direct thread: Alice Admin ↔ Carol Coach (3 messages, 1 unread)`)

  // ANNOUNCEMENT thread: Morning Vinyasa Flow → enrolled students
  if (morningYogaId) {
    const announcementThread = await prisma.messageThread.create({
      data: { type: 'ANNOUNCEMENT', classId: morningYogaId },
    })
    await prisma.threadParticipant.createMany({
      data: [
        { threadId: announcementThread.id, userId: instructorId, canReply: true },
        { threadId: announcementThread.id, userId: 'user_seed_student_1', canReply: false },
        { threadId: announcementThread.id, userId: 'user_seed_student_2', canReply: false },
        { threadId: announcementThread.id, userId: 'user_seed_student_3', canReply: false },
        { threadId: announcementThread.id, userId: 'user_seed_student_4', canReply: false },
      ],
    })
    const announcementMessage1 = await prisma.message.create({
      data: {
        threadId: announcementThread.id,
        senderId: instructorId,
        body: 'Welcome everyone! Please bring a mat and a water bottle. Studio A is on the second floor.',
        sentAt: new Date(Date.now() - 60 * 60 * 1000 * 24),
        readAt: new Date(Date.now() - 60 * 60 * 1000 * 12),
      },
    })
    const announcementMessage2 = await prisma.message.create({
      data: {
        threadId: announcementThread.id,
        senderId: instructorId,
        body: 'Quick reminder — class starts at 7am sharp. See you tomorrow!',
        sentAt: new Date(),
        readAt: null,
      },
    })
    await prisma.messageThread.update({
      where: { id: announcementThread.id },
      data: { lastMessageAt: announcementMessage2.sentAt },
    })
    console.log(`  Announcement thread: Morning Vinyasa Flow (2 messages, 1 unread for students)`)
    void announcementMessage1
  }

  void directMessage1
  void directMessage2
}

async function seedPromotedUser(
  categoryMap: Map<string, string>,
  promotedClerkId: string
) {
  const email = `${promotedClerkId}@promote.dev`
  await prisma.$transaction(async (transaction) => {
    await seedUser(transaction, promotedClerkId, email, 'You', 'Developer')
    await seedRole(transaction, promotedClerkId, 'STUDENT')
    await seedRole(transaction, promotedClerkId, 'INSTRUCTOR')
    await seedRole(transaction, promotedClerkId, 'ADMIN')
    await transaction.instructorProfile.upsert({
      where: { userId: promotedClerkId },
      create: { userId: promotedClerkId },
      update: {},
    })
  })

  const yogaId = categoryMap.get('Yoga')!
  const hiitId = categoryMap.get('HIIT')!

  await prisma.class.createMany({
    data: [
      {
        instructorId: promotedClerkId,
        categoryId: yogaId,
        title: 'My Morning Yoga',
        description: 'Your assigned yoga class for testing.',
        capacity: 15,
        startsAt: daysFromNow(1),
        durationMinutes: 60,
        status: 'ACTIVE',
        location: 'Studio A',
      },
      {
        instructorId: promotedClerkId,
        categoryId: hiitId,
        title: 'My HIIT Circuit',
        description: 'Your assigned HIIT class for testing.',
        capacity: 20,
        startsAt: daysFromNow(4),
        durationMinutes: 45,
        status: 'ACTIVE',
        location: 'Main Floor',
      },
      {
        instructorId: promotedClerkId,
        categoryId: yogaId,
        title: 'My Past Yoga Session',
        description: null,
        capacity: 12,
        startsAt: daysFromNow(-5),
        durationMinutes: 60,
        status: 'COMPLETED',
        location: 'Studio A',
      },
    ],
  })

  // Enroll a few seed students in the promoted user's upcoming class
  const myYogaClass = await prisma.class.findFirst({
    where: { instructorId: promotedClerkId, title: 'My Morning Yoga' },
  })
  if (myYogaClass) {
    for (const userId of ['user_seed_student_1', 'user_seed_student_2', 'user_seed_student_3']) {
      await prisma.registration.upsert({
        where: { userId_classId: { userId, classId: myYogaClass.id } },
        create: { userId, classId: myYogaClass.id, status: 'ENROLLED' },
        update: {},
      })
    }
    await prisma.registration.upsert({
      where: { userId_classId: { userId: 'user_seed_student_4', classId: myYogaClass.id } },
      create: { userId: 'user_seed_student_4', classId: myYogaClass.id, status: 'WAITLISTED', waitlistPosition: 1 },
      update: {},
    })
    console.log(`  Registrations: 3 enrolled + 1 waitlisted in My Morning Yoga`)
  }

  // DIRECT thread: promoted user (as admin) ↔ instructor_2 (Dan Coach)
  const promotedDirectThread = await prisma.messageThread.create({
    data: { type: 'DIRECT' },
  })
  await prisma.threadParticipant.createMany({
    data: [
      { threadId: promotedDirectThread.id, userId: promotedClerkId, canReply: true },
      { threadId: promotedDirectThread.id, userId: 'user_seed_instructor_2', canReply: true },
    ],
  })
  const promotedMessage1 = await prisma.message.create({
    data: {
      threadId: promotedDirectThread.id,
      senderId: 'user_seed_instructor_2',
      body: 'Hey, just wanted to flag that the Dance Studio heating is broken. Could we move Latin Dance Cardio to Studio B?',
      sentAt: new Date(Date.now() - 60 * 60 * 1000 * 3),
      readAt: null,
    },
  })
  await prisma.messageThread.update({
    where: { id: promotedDirectThread.id },
    data: { lastMessageAt: promotedMessage1.sentAt },
  })
  console.log(`  Direct thread: You ↔ Dan Coach (1 unread message waiting for you)`)

  // ANNOUNCEMENT thread for "My Morning Yoga" → enrolled students
  if (myYogaClass) {
    const promotedAnnouncementThread = await prisma.messageThread.create({
      data: { type: 'ANNOUNCEMENT', classId: myYogaClass.id },
    })
    await prisma.threadParticipant.createMany({
      data: [
        { threadId: promotedAnnouncementThread.id, userId: promotedClerkId, canReply: true },
        { threadId: promotedAnnouncementThread.id, userId: 'user_seed_student_1', canReply: false },
        { threadId: promotedAnnouncementThread.id, userId: 'user_seed_student_2', canReply: false },
        { threadId: promotedAnnouncementThread.id, userId: 'user_seed_student_3', canReply: false },
      ],
    })
    const promotedAnnouncement = await prisma.message.create({
      data: {
        threadId: promotedAnnouncementThread.id,
        senderId: promotedClerkId,
        body: 'Hi everyone — your first class is coming up. Bring a mat, arrive 5 minutes early.',
        sentAt: new Date(Date.now() - 60 * 60 * 1000),
        readAt: null,
      },
    })
    await prisma.messageThread.update({
      where: { id: promotedAnnouncementThread.id },
      data: { lastMessageAt: promotedAnnouncement.sentAt },
    })
    console.log(`  Announcement thread: My Morning Yoga (sent as instructor, 3 student recipients)`)
  }

  console.log(`  Promoted user: ${promotedClerkId} → STUDENT + INSTRUCTOR + ADMIN`)
}

async function main() {
  console.log('Seeding database...')

  console.log('\nUsers:')
  for (const admin of admins) {
    await prisma.$transaction(async (transaction) => {
      await seedUser(transaction, admin.clerkId, admin.email, admin.firstName, admin.lastName)
      await seedRole(transaction, admin.clerkId, 'STUDENT')
      await seedRole(transaction, admin.clerkId, 'ADMIN')
    })
    console.log(`  Admin: ${admin.email}`)
  }

  for (const instructor of instructors) {
    await prisma.$transaction(async (transaction) => {
      await seedUser(transaction, instructor.clerkId, instructor.email, instructor.firstName, instructor.lastName)
      await seedRole(transaction, instructor.clerkId, 'STUDENT')
      await seedRole(transaction, instructor.clerkId, 'INSTRUCTOR')
      await transaction.instructorProfile.upsert({
        where: { userId: instructor.clerkId },
        create: { userId: instructor.clerkId },
        update: {},
      })
    })
    console.log(`  Instructor: ${instructor.email}`)
  }

  for (const student of students) {
    await prisma.$transaction(async (transaction) => {
      await seedUser(transaction, student.clerkId, student.email, student.firstName, student.lastName)
      await seedRole(transaction, student.clerkId, 'STUDENT')
    })
    console.log(`  Student: ${student.email}`)
  }

  console.log('\nCategories:')
  const categoryMap = await seedCategories()

  console.log('\nClasses:')
  const standaloneClassIds = await seedClasses(categoryMap)

  console.log('\nLesson Sets:')
  await seedLessonSets(categoryMap)

  console.log('\nMembership Plans:')
  await seedMembershipPlans()

  console.log('\nMemberships:')
  await seedMemberships()

  console.log('\nRegistrations:')
  await seedRegistrations(standaloneClassIds)

  console.log('\nMessages:')
  await seedMessages(standaloneClassIds)

  const promotedClerkId = process.env['PROMOTE_USER_ID']
  if (promotedClerkId) {
    console.log('\nPromoted user:')
    await seedPromotedUser(categoryMap, promotedClerkId)
  } else {
    console.log('\nTip: set PROMOTE_USER_ID=<your_clerk_id> to grant yourself ADMIN + INSTRUCTOR roles')
    console.log('     and get test classes assigned to your account.')
  }

  console.log('\nSeeding complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
