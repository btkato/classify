/*
  Warnings:

  - The values [NO_SHOW] on the enum `RegistrationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `category` on the `Class` table. All the data in the column will be lost.
  - The primary key for the `InstructorProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `avatarUrl` on the `InstructorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `certifications` on the `InstructorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `InstructorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `specialties` on the `InstructorProfile` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `MembershipTransaction` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `NotificationJob` table. All the data in the column will be lost.
  - You are about to drop the column `registeredAt` on the `Registration` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `InstructorProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `triggerId` to the `NotificationJob` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TriggerEvent" AS ENUM ('MEMBERSHIP_EXPIRING', 'MEMBERSHIP_EXPIRED', 'MEMBERSHIP_EXHAUSTED', 'AFTER_CLASS_ATTENDED', 'CLASS_COUNT_REACHED', 'DAYS_INACTIVE', 'AFTER_PURCHASE');

-- AlterEnum
ALTER TYPE "MembershipType" ADD VALUE 'CONTINUOUS_MONTHLY';

-- AlterEnum
BEGIN;
CREATE TYPE "RegistrationStatus_new" AS ENUM ('ENROLLED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'ABSENT');
ALTER TABLE "public"."Registration" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Registration" ALTER COLUMN "status" TYPE "RegistrationStatus_new" USING ("status"::text::"RegistrationStatus_new");
ALTER TYPE "RegistrationStatus" RENAME TO "RegistrationStatus_old";
ALTER TYPE "RegistrationStatus_new" RENAME TO "RegistrationStatus";
DROP TYPE "public"."RegistrationStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "NotificationJob" DROP CONSTRAINT "NotificationJob_membershipId_fkey";

-- DropIndex
DROP INDEX "Announcement_sentAt_idx";

-- DropIndex
DROP INDEX "Class_category_idx";

-- DropIndex
DROP INDEX "Class_category_startsAt_idx";

-- DropIndex
DROP INDEX "Class_startsAt_idx";

-- DropIndex
DROP INDEX "InstructorProfile_userId_key";

-- DropIndex
DROP INDEX "Membership_userId_idx";

-- DropIndex
DROP INDEX "Membership_userId_status_idx";

-- DropIndex
DROP INDEX "Registration_classId_status_idx";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "InstructorProfile" DROP CONSTRAINT "InstructorProfile_pkey",
DROP COLUMN "avatarUrl",
DROP COLUMN "certifications",
DROP COLUMN "id",
DROP COLUMN "specialties",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "InstructorProfile_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "startsAt",
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MembershipTransaction" DROP COLUMN "action";

-- AlterTable
ALTER TABLE "NotificationJob" DROP COLUMN "type",
ADD COLUMN     "triggerId" TEXT NOT NULL,
ALTER COLUMN "membershipId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Registration" DROP COLUMN "registeredAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3);

-- DropEnum
DROP TYPE "ClassCategory";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "TransactionAction";

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "validityPeriodMonths" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorCertification" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTrigger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerEvent" "TriggerEvent" NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certification_name_key" ON "Certification"("name");

-- CreateIndex
CREATE INDEX "InstructorCertification_instructorId_idx" ON "InstructorCertification"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorCertification_instructorId_certificationId_key" ON "InstructorCertification"("instructorId", "certificationId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCategory_name_key" ON "ClassCategory"("name");

-- CreateIndex
CREATE INDEX "NotificationTrigger_triggerEvent_idx" ON "NotificationTrigger"("triggerEvent");

-- CreateIndex
CREATE INDEX "NotificationTrigger_isActive_idx" ON "NotificationTrigger"("isActive");

-- CreateIndex
CREATE INDEX "Class_status_idx" ON "Class"("status");

-- CreateIndex
CREATE INDEX "MembershipTransaction_registrationId_idx" ON "MembershipTransaction"("registrationId");

-- AddForeignKey
ALTER TABLE "InstructorCertification" ADD CONSTRAINT "InstructorCertification_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "InstructorProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorCertification" ADD CONSTRAINT "InstructorCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ClassCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "NotificationTrigger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
