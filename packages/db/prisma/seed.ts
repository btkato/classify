import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

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

async function seedUser(
  transaction: TransactionClient,
  clerkId: string,
  email: string,
  firstName: string,
  lastName: string
) {
  return transaction.user.upsert({
    where: { id: clerkId },
    create: { id: clerkId, email, firstName, lastName, passwordHash: 'clerk_managed' },
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

async function main() {
  console.log('Seeding database...')

  for (const admin of admins) {
    await prisma.$transaction(async (transaction) => {
      await seedUser(transaction, admin.clerkId, admin.email, admin.firstName, admin.lastName)
      await seedRole(transaction, admin.clerkId, 'STUDENT')
      await seedRole(transaction, admin.clerkId, 'ADMIN')
    })
    console.log(`Created admin: ${admin.email}`)
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
    console.log(`Created instructor: ${instructor.email}`)
  }

  for (const student of students) {
    await prisma.$transaction(async (transaction) => {
      await seedUser(transaction, student.clerkId, student.email, student.firstName, student.lastName)
      await seedRole(transaction, student.clerkId, 'STUDENT')
    })
    console.log(`Created student: ${student.email}`)
  }

  console.log('Seeding complete.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
