import argon2 from 'argon2';
import { AuthMethod, DelegationStatus, UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';

export class DelegationService {
  /**
   * Provider requests access using Patient's 9-digit Unit ID
   */
  static async requestAccess(providerUserId: string, patientMedilockerId: string) {
    const patient = await prisma.user.findUnique({
      where: { medilockerId: patientMedilockerId.toUpperCase() },
      include: { patientProfile: true },
    });

    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new AppError('No patient found with this MediLocker Unit ID.', 404);
    }

    return {
      patientId: patient.id,
      medilockerId: patient.medilockerId,
      patientName: patient.patientProfile?.fullName || 'Patient',
      challenge: `Enter 6-digit MPIN or Biometric touch for ${patient.patientProfile?.fullName}`,
    };
  }

  /**
   * Patient authorizes access on terminal using their MPIN or Biometrics
   */
  static async authorizeAccess(
    providerUserId: string,
    providerRole: UserRole,
    patientMedilockerId: string,
    authMethod: AuthMethod,
    mpin?: string,
    allottedDoctorId?: string
  ) {
    const patient = await prisma.user.findUnique({
      where: { medilockerId: patientMedilockerId.toUpperCase() },
    });

    if (!patient || !patient.mpinHash) {
      throw new AppError('Patient not found or MPIN not configured.', 404);
    }

    // Verify Patient MPIN
    if (authMethod === AuthMethod.MPIN) {
      if (!mpin) throw new AppError('Patient MPIN is required.', 400);
      const isMpinValid = await argon2.verify(patient.mpinHash, mpin);
      if (!isMpinValid) {
        throw new AppError('Authorization failed: Incorrect Patient MPIN.', 401);
      }
    }

    // Determine Doctor & Hospital bindings
    let doctorProfileId: string;
    let hospitalProfileId: string | null = null;

    if (providerRole === UserRole.DOCTOR) {
      const docProfile = await prisma.doctorProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!docProfile) throw new AppError('Doctor profile not found.', 404);
      doctorProfileId = docProfile.id;
    } else {
      // Hospital role: Must allot a specific doctor under this hospital
      const hospProfile = await prisma.hospitalProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!hospProfile) throw new AppError('Hospital profile not found.', 404);
      hospitalProfileId = hospProfile.id;

      if (!allottedDoctorId) {
        // Find first active doctor in hospital roster if not explicitly chosen
        const docMapping = await prisma.hospitalDoctor.findFirst({
          where: { hospitalId: hospProfile.id, isActive: true },
        });
        if (!docMapping) {
          throw new AppError('No active registered doctors found under this hospital to allot.', 400);
        }
        doctorProfileId = docMapping.doctorId;
      } else {
        doctorProfileId = allottedDoctorId;
      }
    }

    // 2-hour scoped access delegation
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const delegation = await prisma.patientAccessDelegation.create({
      data: {
        patientId: patient.id,
        hospitalId: hospitalProfileId,
        allottedDoctorId: doctorProfileId,
        authorizationMethod: authMethod,
        status: DelegationStatus.ACTIVE,
        expiresAt,
      },
      include: {
        allottedDoctor: true,
      },
    });

    // Create immutable audit log entry
    await prisma.auditLog.create({
      data: {
        userId: providerUserId,
        action: 'PATIENT_UNLOCKED_WITH_CONSENT',
        resourceType: 'PATIENT_RECORD',
        resourceId: patient.id,
        eventDetails: {
          patientMedilockerId: patient.medilockerId,
          authMethod,
          allottedDoctorId: doctorProfileId,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    logger.info(`Patient ${patient.medilockerId} unlocked with consent for doctor ${doctorProfileId}`);

    return {
      success: true,
      message: 'Patient access authorized successfully.',
      delegationId: delegation.id,
      patientId: patient.id,
      allottedDoctorName: delegation.allottedDoctor.fullName,
      expiresAt,
    };
  }

  /**
   * Hospital assigns authorized patient to specific registered doctor
   */
  static async assignDoctor(hospitalUserId: string, delegationId: string, doctorId: string) {
    const hospProfile = await prisma.hospitalProfile.findUnique({
      where: { userId: hospitalUserId },
    });
    if (!hospProfile) throw new AppError('Hospital profile not found.', 404);

    const delegation = await prisma.patientAccessDelegation.findFirst({
      where: { id: delegationId, hospitalId: hospProfile.id },
    });

    if (!delegation) {
      throw new AppError('Delegation record not found for this hospital.', 404);
    }

    const updated = await prisma.patientAccessDelegation.update({
      where: { id: delegationId },
      data: { allottedDoctorId: doctorId },
      include: { allottedDoctor: true },
    });

    logger.info(`Delegation ${delegationId} re-assigned to doctor ${doctorId}`);

    return updated;
  }

  /**
   * Doctor views list of currently authorized patients
   */
  static async getDoctorActivePatients(doctorUserId: string) {
    const docProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });
    if (!docProfile) throw new AppError('Doctor profile not found.', 404);

    const now = new Date();

    const delegations = await prisma.patientAccessDelegation.findMany({
      where: {
        allottedDoctorId: docProfile.id,
        status: DelegationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
      include: {
        patient: {
          include: { patientProfile: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });

    return delegations.map((d) => ({
      delegationId: d.id,
      patientId: d.patient.id,
      medilockerId: d.patient.medilockerId,
      fullName: d.patient.patientProfile?.fullName || 'Patient',
      dob: d.patient.patientProfile?.dob,
      bloodGroup: d.patient.patientProfile?.bloodGroup,
      allergies: d.patient.patientProfile?.baselineAllergies,
      expiresAt: d.expiresAt,
    }));
  }

  /**
   * Doctor opens authorized patient's full medical records and symptom synopsis
   */
  static async getAuthorizedPatientRecords(doctorUserId: string, patientId: string) {
    const docProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });
    if (!docProfile) throw new AppError('Doctor profile not found.', 404);

    // Verify active delegation
    const now = new Date();
    const activeDelegation = await prisma.patientAccessDelegation.findFirst({
      where: {
        patientId,
        allottedDoctorId: docProfile.id,
        status: DelegationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });

    if (!activeDelegation) {
      throw new AppError('Access Denied: No active patient authorization found or session expired.', 403);
    }

    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      include: {
        patientProfile: true,
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          include: { prescribedMeds: true, record: true },
        },
        feelingLogs: {
          orderBy: { logDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!patient) throw new AppError('Patient record not found.', 404);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: doctorUserId,
        action: 'DOCTOR_VIEWED_PATIENT_RECORDS',
        resourceType: 'PATIENT_RECORD',
        resourceId: patientId,
      },
    });

    return {
      profile: patient.patientProfile,
      medilockerId: patient.medilockerId,
      timeline: patient.timelineEvents,
      symptomSynopsis: patient.feelingLogs,
    };
  }
}
