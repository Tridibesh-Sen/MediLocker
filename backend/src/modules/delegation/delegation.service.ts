import { AuthMethod, DelegationStatus, UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';
import { cacheService } from '../../utils/cache';

export class DelegationService {
  /**
   * Search patient by MediLocker Unit ID
   * Constraint: Returns ONLY patient name and DOB (no medical records)
   */
  static async searchPatient(medilockerId: string) {
    if (!medilockerId || typeof medilockerId !== 'string') {
      throw new AppError('Patient MediLocker Unit ID is required.', 400);
    }

    const cleanId = medilockerId.trim().toUpperCase();

    // 1. Check cache
    const cached = await cacheService.get(`patient:search:${cleanId}`);
    if (cached) {
      return cached;
    }

    const patient = await prisma.user.findUnique({
      where: { medilockerId: cleanId },
      include: {
        patientProfile: {
          select: {
            fullName: true,
            dob: true,
          },
        },
      },
    });

    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new AppError('No registered patient found with this MediLocker Unit ID.', 404);
    }

    const result = {
      medilockerId: patient.medilockerId,
      fullName: patient.patientProfile?.fullName || 'Patient',
      dob: patient.patientProfile?.dob || null,
    };

    // Cache for 15 minutes
    cacheService.set(`patient:search:${cleanId}`, result, 900);

    return result;
  }

  /**
   * Doctor or Hospital sends access request with specified duration (30 mins to 7 days)
   * Generates a dynamic 6-digit verification code valid for 15 minutes.
   */
  static async createAccessRequest(
    providerUserId: string,
    providerRole: UserRole,
    patientMedilockerId: string,
    durationMinutes: number
  ) {
    if (!patientMedilockerId) {
      throw new AppError('Patient Unit ID is required.', 400);
    }

    // Validate duration bounds (30 minutes to 7 days = 10080 minutes)
    const validMinutes = Math.max(30, Math.min(10080, Number(durationMinutes) || 120));

    const patient = await prisma.user.findUnique({
      where: { medilockerId: patientMedilockerId.trim().toUpperCase() },
      include: { patientProfile: true },
    });

    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new AppError('No patient found with this MediLocker Unit ID.', 404);
    }

    // Resolve doctor & hospital profile IDs
    let doctorProfileId: string;
    let hospitalProfileId: string | null = null;

    if (providerRole === UserRole.DOCTOR) {
      const docProfile = await prisma.doctorProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!docProfile) throw new AppError('Doctor profile not found.', 404);
      doctorProfileId = docProfile.id;
    } else {
      const hospProfile = await prisma.hospitalProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!hospProfile) throw new AppError('Hospital profile not found.', 404);
      hospitalProfileId = hospProfile.id;

      const docMapping = await prisma.hospitalDoctor.findFirst({
        where: { hospitalId: hospProfile.id, isActive: true },
      });
      if (!docMapping) {
        throw new AppError('No active registered doctors found under this hospital.', 400);
      }
      doctorProfileId = docMapping.doctorId;
    }

    // Generate 6-digit dynamic code
    const sixDigitCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create the delegation request record
    const delegation = await prisma.patientAccessDelegation.create({
      data: {
        patientId: patient.id,
        hospitalId: hospitalProfileId,
        allottedDoctorId: doctorProfileId,
        authorizationMethod: AuthMethod.MPIN,
        status: DelegationStatus.REQUESTED,
        authCode: sixDigitCode,
        codeExpiresAt,
        requestedDurationMinutes: validMinutes,
      },
      include: {
        allottedDoctor: true,
      },
    });

    logger.info(
      `Access request created: Doctor ${delegation.allottedDoctor.fullName} requested ${validMinutes}m access to patient ${patient.medilockerId}`
    );

    return {
      delegationId: delegation.id,
      patientMedilockerId: patient.medilockerId,
      patientName: patient.patientProfile?.fullName || 'Patient',
      requestedDurationMinutes: validMinutes,
      codeValidityMinutes: 15,
      message: 'Access request sent successfully. Please enter the 6-digit code provided by the patient to complete authorization.',
    };
  }

  /**
   * Doctor verifies patient's 6-digit authorization code and unlocks full records
   */
  static async verifyAccessCode(
    providerUserId: string,
    providerRole: UserRole,
    patientMedilockerId: string,
    authCode: string
  ) {
    if (!patientMedilockerId || !authCode) {
      throw new AppError('Patient Unit ID and 6-digit authorization code are required.', 400);
    }

    const cleanCode = authCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new AppError('Authorization code must be exactly 6 digits.', 400);
    }

    const patient = await prisma.user.findUnique({
      where: { medilockerId: patientMedilockerId.trim().toUpperCase() },
      include: { patientProfile: true },
    });

    if (!patient) {
      throw new AppError('Patient not found.', 404);
    }

    // Resolve doctor profile
    let doctorProfileId: string;
    if (providerRole === UserRole.DOCTOR) {
      const docProfile = await prisma.doctorProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!docProfile) throw new AppError('Doctor profile not found.', 404);
      doctorProfileId = docProfile.id;
    } else {
      const hospProfile = await prisma.hospitalProfile.findUnique({
        where: { userId: providerUserId },
      });
      if (!hospProfile) throw new AppError('Hospital profile not found.', 404);
      const docMapping = await prisma.hospitalDoctor.findFirst({
        where: { hospitalId: hospProfile.id, isActive: true },
      });
      if (!docMapping) throw new AppError('No registered doctor found.', 400);
      doctorProfileId = docMapping.doctorId;
    }

    const now = new Date();

    // Find pending request matching this patient, doctor, and code
    const delegation = await prisma.patientAccessDelegation.findFirst({
      where: {
        patientId: patient.id,
        allottedDoctorId: doctorProfileId,
        status: DelegationStatus.REQUESTED,
        authCode: cleanCode,
        codeExpiresAt: { gt: now },
      },
      include: {
        allottedDoctor: true,
      },
    });

    if (!delegation) {
      throw new AppError(
        'Invalid or expired 6-digit authorization code. Please verify with the patient or request a new code.',
        401
      );
    }

    // Grant access for the requested duration
    const durationMs = delegation.requestedDurationMinutes * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    const updatedDelegation = await prisma.patientAccessDelegation.update({
      where: { id: delegation.id },
      data: {
        status: DelegationStatus.ACTIVE,
        grantedAt: now,
        expiresAt,
      },
      include: {
        allottedDoctor: true,
      },
    });

    // Immutable audit log
    await prisma.auditLog.create({
      data: {
        userId: providerUserId,
        action: 'PATIENT_UNLOCKED_WITH_6DIGIT_CODE',
        resourceType: 'PATIENT_RECORD',
        resourceId: patient.id,
        eventDetails: {
          patientMedilockerId: patient.medilockerId,
          allottedDoctorId: doctorProfileId,
          durationMinutes: delegation.requestedDurationMinutes,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    logger.info(`Doctor ${delegation.allottedDoctor.fullName} unlocked patient ${patient.medilockerId} until ${expiresAt.toISOString()}`);

    return {
      success: true,
      message: `Full clinical access granted for ${delegation.requestedDurationMinutes >= 1440 ? `${Math.round(delegation.requestedDurationMinutes / 1440)} day(s)` : `${Math.round(delegation.requestedDurationMinutes / 60)} hour(s)`}.`,
      delegationId: updatedDelegation.id,
      patientId: patient.id,
      patientMedilockerId: patient.medilockerId,
      patientName: patient.patientProfile?.fullName,
      expiresAt,
    };
  }

  /**
   * Patient views all incoming requests and active authorizations
   */
  static async getPatientRequests(patientUserId: string) {
    const now = new Date();

    const delegations = await prisma.patientAccessDelegation.findMany({
      where: {
        patientId: patientUserId,
      },
      include: {
        allottedDoctor: true,
        hospital: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Auto-expire any active delegations past their expiry date
    const pendingRequests = [];
    const activeDelegations = [];
    const pastHistory = [];

    for (const d of delegations) {
      const isCodeExpired = d.codeExpiresAt && d.codeExpiresAt < now;
      const isAccessExpired = d.expiresAt && d.expiresAt < now;

      if (d.status === DelegationStatus.REQUESTED) {
        if (!isCodeExpired) {
          pendingRequests.push({
            id: d.id,
            doctorName: d.allottedDoctor.fullName,
            organization: d.hospital?.hospitalName || d.allottedDoctor.clinicName || 'Independent Medical Practice',
            registrationNumber: d.allottedDoctor.registrationNumber,
            specialization: d.allottedDoctor.specialization,
            authCode: d.authCode,
            codeExpiresAt: d.codeExpiresAt,
            requestedDurationMinutes: d.requestedDurationMinutes,
            status: d.status,
            createdAt: d.createdAt,
          });
        }
      } else if (d.status === DelegationStatus.ACTIVE) {
        if (!isAccessExpired) {
          activeDelegations.push({
            id: d.id,
            doctorName: d.allottedDoctor.fullName,
            organization: d.hospital?.hospitalName || d.allottedDoctor.clinicName || 'Independent Medical Practice',
            registrationNumber: d.allottedDoctor.registrationNumber,
            specialization: d.allottedDoctor.specialization,
            grantedAt: d.grantedAt,
            expiresAt: d.expiresAt,
            requestedDurationMinutes: d.requestedDurationMinutes,
            status: d.status,
          });
        } else {
          // Mark expired in DB
          prisma.patientAccessDelegation.update({
            where: { id: d.id },
            data: { status: DelegationStatus.EXPIRED },
          }).catch(() => {});
        }
      } else {
        pastHistory.push({
          id: d.id,
          doctorName: d.allottedDoctor.fullName,
          organization: d.hospital?.hospitalName || d.allottedDoctor.clinicName || 'Independent Medical Practice',
          status: d.status,
          grantedAt: d.grantedAt,
          revokedAt: d.revokedAt,
          expiresAt: d.expiresAt,
        });
      }
    }

    return {
      pendingRequests,
      activeDelegations,
      pastHistory,
    };
  }

  /**
   * Revoke delegation immediately
   */
  static async revokeDelegation(userId: string, role: UserRole, delegationId: string) {
    const delegation = await prisma.patientAccessDelegation.findUnique({
      where: { id: delegationId },
      include: { allottedDoctor: true },
    });

    if (!delegation) {
      throw new AppError('Delegation record not found.', 404);
    }

    // Patient can revoke their own records; Doctor can revoke their granted access
    if (role === UserRole.PATIENT && delegation.patientId !== userId) {
      throw new AppError('You do not have permission to revoke this delegation.', 403);
    }

    const updated = await prisma.patientAccessDelegation.update({
      where: { id: delegationId },
      data: {
        status: DelegationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PATIENT_ACCESS_REVOKED',
        resourceType: 'PATIENT_RECORD',
        resourceId: delegation.patientId,
        eventDetails: {
          delegationId,
          revokedByRole: role,
        },
      },
    });

    return {
      success: true,
      message: 'Access delegation has been revoked immediately.',
      delegationId: updated.id,
    };
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
   * Doctor retrieves full patient dashboard & clinical information under active authorization
   */
  static async getAuthorizedPatientFullData(doctorUserId: string, patientMedilockerOrId: string) {
    const docProfile = await prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });
    if (!docProfile) throw new AppError('Doctor profile not found.', 404);

    // Find patient by ID or Unit ID
    const cleanParam = patientMedilockerOrId.trim();
    const patient = await prisma.user.findFirst({
      where: {
        OR: [{ id: cleanParam }, { medilockerId: cleanParam.toUpperCase() }],
      },
      include: {
        patientProfile: true,
        medicalRecords: {
          orderBy: { uploadedAt: 'desc' },
        },
        timelineEvents: {
          orderBy: { createdAt: 'desc' },
          include: { prescribedMeds: true, record: true },
        },
        todoItems: {
          orderBy: { scheduleDate: 'desc' },
          take: 30,
        },
        homeSupplies: {
          orderBy: { addedAt: 'desc' },
        },
        feelingLogs: {
          orderBy: { logDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!patient) {
      throw new AppError('Patient record not found.', 404);
    }

    const now = new Date();

    // Check active authorization
    const activeDelegation = await prisma.patientAccessDelegation.findFirst({
      where: {
        patientId: patient.id,
        allottedDoctorId: docProfile.id,
        status: DelegationStatus.ACTIVE,
        expiresAt: { gt: now },
      },
    });

    if (!activeDelegation) {
      throw new AppError(
        'Access Denied: Consultation authorization has expired or was revoked by the patient.',
        403
      );
    }

    // Audit log access
    await prisma.auditLog.create({
      data: {
        userId: doctorUserId,
        action: 'DOCTOR_VIEWED_PATIENT_FULL_DATA',
        resourceType: 'PATIENT_RECORD',
        resourceId: patient.id,
        eventDetails: {
          delegationId: activeDelegation.id,
          expiresAt: activeDelegation.expiresAt?.toISOString(),
        },
      },
    });

    return {
      delegation: {
        id: activeDelegation.id,
        expiresAt: activeDelegation.expiresAt,
        status: activeDelegation.status,
      },
      patient: {
        id: patient.id,
        medilockerId: patient.medilockerId,
        email: patient.email,
        phone: patient.phone,
        profile: patient.patientProfile,
      },
      medicalRecords: patient.medicalRecords,
      timelineEvents: patient.timelineEvents,
      todoItems: patient.todoItems,
      homeSupplies: patient.homeSupplies,
      feelingLogs: patient.feelingLogs,
    };
  }
}
