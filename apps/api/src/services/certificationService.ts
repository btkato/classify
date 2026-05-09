import { prisma } from '../lib/prisma.js'
import { NotFoundError } from '../lib/errors.js'
import type { Certification, InstructorCertification } from 'db'

export async function listCertifications(): Promise<Certification[]> {
  return prisma.certification.findMany({ orderBy: { name: 'asc' } })
}

export async function createCertification(name: string, validityPeriodMonths: number): Promise<Certification> {
  return prisma.certification.create({
    data: { name, validityPeriodMonths },
  })
}

export async function assignInstructorCertifications(
  instructorId: string,
  assignments: Array<{ certificationId: string; issuedAt: Date }>
): Promise<InstructorCertification[]> {
  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.instructorProfile.findUnique({ where: { userId: instructorId } })
    if (!profile) throw new NotFoundError('Instructor not found')

    await transaction.instructorCertification.deleteMany({ where: { instructorId } })

    if (assignments.length > 0) {
      const certificationIds = assignments.map((a) => a.certificationId)
      const certifications = await transaction.certification.findMany({
        where: { id: { in: certificationIds } },
      })
      if (certifications.length !== certificationIds.length) {
        throw new NotFoundError('One or more certifications not found')
      }

      const certMap = new Map(certifications.map((certification) => [certification.id, certification]))

      const data = assignments.map((assignment) => {
        const cert = certMap.get(assignment.certificationId)
        if (!cert) throw new NotFoundError(`Certification ${assignment.certificationId} not found`)
        const expiresAt = new Date(assignment.issuedAt)
        expiresAt.setMonth(expiresAt.getMonth() + cert.validityPeriodMonths)
        return { instructorId, certificationId: assignment.certificationId, issuedAt: assignment.issuedAt, expiresAt }
      })

      await transaction.instructorCertification.createMany({ data })
    }

    return transaction.instructorCertification.findMany({ where: { instructorId } })
  })
}
