import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { generateMediLockerId } from '../../utils/idGenerator';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';
import { cacheService } from '../../utils/cache';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// Temporary challenge store for WebAuthn in-memory (or Upstash Redis)
const webauthnChallenges = new Map<string, string>();

export class AuthService {
  /**
   * Register a new Patient, Doctor, or Hospital
   */
  static async signup(data: any) {
    const cleanEmail = String(data.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new AppError('Valid email address is required.', 400);
    }

    const existing = await prisma.user.findFirst({
      where: { email: cleanEmail },
    }).catch(() => null);

    if (existing) {
      throw new AppError(`An account with email "${cleanEmail}" is already registered (Associated Unit ID: ${existing.medilockerId}). Duplicate accounts for the same email are not allowed. Please sign in.`, 409);
    }

    // Generate unique 9-digit MediLocker Unit ID
    let unitId = generateMediLockerId();
    let collisionCheck = await prisma.user.findUnique({ where: { medilockerId: unitId } }).catch(() => null);
    while (collisionCheck) {
      unitId = generateMediLockerId();
      collisionCheck = await prisma.user.findUnique({ where: { medilockerId: unitId } }).catch(() => null);
    }

    // Hash MPIN if provided during registration
    let mpinHash: string | null = null;
    if (data.mpin) {
      mpinHash = await argon2.hash(data.mpin, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
    }

    // Create User record
    const user = await prisma.user.create({
      data: {
        medilockerId: unitId,
        email: data.email.toLowerCase(),
        phone: data.phone,
        role: data.role,
        mpinHash,
        isVerified: data.role === UserRole.PATIENT,
      },
    });

    // Create Role-Specific Profile
    if (data.role === UserRole.PATIENT) {
      await prisma.patientProfile.create({
        data: {
          userId: user.id,
          fullName: data.fullName || data.name || 'Patient',
          dob: data.dob ? new Date(data.dob) : null,
          gender: data.gender,
          bloodGroup: data.bloodGroup || data.blood,
          insuranceProvider: data.insuranceProvider || data.insurance,
          baselineAllergies: data.baselineAllergies || data.allergy,
          baselineMedications: data.baselineMedications || data.medications,
          medicalHistory: data.medicalHistory || data.history,
          emergencyContactName: data.emergencyContactName || data.emergency,
          emergencyContactPhone: data.emergencyContactPhone,
          addressLine: data.addressLine || data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
        },
      });
    } else if (data.role === UserRole.DOCTOR) {
      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          fullName: data.fullName || data.name || 'Doctor',
          professionalEmail: data.email.toLowerCase(),
          phone: data.phone,
          institutionalDoctorId: data.institutionalDoctorId || data.doctorId || `DOC-${Date.now().toString().slice(-6)}`,
          registrationNumber: data.registrationNumber,
          specialization: data.specialization || 'General Medicine',
          registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
          yearsExperience: Number(data.yearsExperience || data.experience) || 0,
          clinicName: data.clinicName || 'Clinical Practice',
          clinicVerificationRef: data.clinicVerificationRef || data.clinicVerification,
          clinicAddress: data.clinicAddress || data.address || 'Medical Facility',
          city: data.city || 'City',
          state: data.state || 'State',
          verificationStatus: 'PENDING_VERIFICATION',
        },
      });
    } else if (data.role === UserRole.HOSPITAL) {
      await prisma.hospitalProfile.create({
        data: {
          userId: user.id,
          hospitalName: data.name,
          officialEmail: data.email.toLowerCase(),
          phone: data.phone,
          hospitalId: data.hospitalId,
          licenseNumber: data.license,
          registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
          address: data.address,
          city: data.city,
          state: data.state,
          hospitalType: data.hospitalType,
          bedCapacity: Number(data.beds) || 0,
          authorizedRepresentative: data.representative,
          verificationStatus: 'PENDING_VERIFICATION',
          verificationRef: data.verificationRef,
        },
      });
    }

    logger.info(`User registered successfully: ${user.medilockerId} (${user.role})`);

    const token = jwt.sign(
      {
        userId: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return {
      token,
      user: {
        id: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        name: data.name,
        role: user.role.toLowerCase(),
        bloodGroup: data.blood,
        allergies: data.allergy ? [data.allergy] : [],
        chronicConditions: data.history ? [data.history] : [],
        emergencyContact: {
          name: data.emergency || 'Emergency Contact',
          phone: data.emergencyPhone || data.phone,
          relation: 'Family',
        }
      },
      message: 'Account created successfully.',
    };
  }

  /**
   * Configure 6-digit Master MPIN using Argon2id
   */
  static async setupMpin(medilockerId: string, mpin: string) {
    const user = await prisma.user.findUnique({
      where: { medilockerId: medilockerId.toUpperCase() },
    });

    if (!user) {
      throw new AppError('User not found with this MediLocker Unit ID.', 404);
    }

    const hashedMpin = await argon2.hash(mpin, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { mpinHash: hashedMpin },
    });

    logger.info(`MPIN configured for ${user.medilockerId}`);

    return {
      success: true,
      message: '6-digit MPIN set successfully.',
    };
  }

  /**
   * Authenticate via Email + Unit ID
   */
  static async login(
    params: { email?: string; medilockerId?: string; identifier?: string; role?: any; mpin?: string } | string,
    roleParam?: any,
    mpinParam?: string
  ) {
    let email = '';
    let medilockerId = '';
    let roleUpper: UserRole = UserRole.PATIENT;
    let mpin: string | undefined;

    if (typeof params === 'object') {
      email = String(params.email || '').trim().toLowerCase();
      medilockerId = String(params.medilockerId || '').trim().toUpperCase();
      const identifier = String(params.identifier || '').trim();
      roleUpper = String(params.role || 'PATIENT').toUpperCase() as UserRole;
      mpin = params.mpin;

      if (!email && identifier.includes('@')) {
        email = identifier.toLowerCase();
      }
      if (!medilockerId && identifier.toUpperCase().startsWith('ML-')) {
        medilockerId = identifier.toUpperCase();
      }
    } else {
      const cleanId = String(params || '').trim();
      if (cleanId.includes('@')) {
        email = cleanId.toLowerCase();
      } else if (cleanId.toUpperCase().startsWith('ML-')) {
        medilockerId = cleanId.toUpperCase();
      } else {
        email = cleanId.toLowerCase();
      }
      roleUpper = String(roleParam || 'PATIENT').toUpperCase() as UserRole;
      mpin = mpinParam;
    }

    let user: any = null;

    // Both email and Unit ID provided: STRICT 2-WAY CHECK
    if (email && medilockerId) {
      const userByEmail = await prisma.user.findUnique({
        where: { email },
        include: {
          patientProfile: true,
          doctorProfile: true,
          hospitalProfile: true,
        },
      });

      if (!userByEmail) {
        throw new AppError(`No registered account found with email "${email}". Please verify your email or sign up.`, 401);
      }

      if (userByEmail.medilockerId.toUpperCase() !== medilockerId.toUpperCase()) {
        throw new AppError(`Unit ID mismatch: The provided Unit ID (${medilockerId}) does not match the account associated with email ${email}.`, 401);
      }

      user = userByEmail;
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          patientProfile: true,
          doctorProfile: true,
          hospitalProfile: true,
        },
      });
      if (!user) {
        throw new AppError(`No registered account found with email "${email}".`, 401);
      }
    } else if (medilockerId) {
      user = await prisma.user.findUnique({
        where: { medilockerId },
        include: {
          patientProfile: true,
          doctorProfile: true,
          hospitalProfile: true,
        },
      });
      if (!user) {
        throw new AppError(`No registered account found with Unit ID "${medilockerId}".`, 401);
      }
    } else {
      throw new AppError('Email address and Unique Unit ID are required to sign in.', 400);
    }

    if (user.role !== roleUpper) {
      throw new AppError(`This account is registered under the ${user.role} portal. Please select the correct portal tab.`, 403);
    }

    // Verify MPIN if configured
    if (user.mpinHash) {
      if (!mpin) {
        throw new AppError('6-digit MPIN is required for this account.', 401);
      }
      const isMpinValid = await argon2.verify(user.mpinHash, mpin);
      if (!isMpinValid) {
        throw new AppError('Invalid 6-digit MPIN.', 401);
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    const name =
      user.patientProfile?.fullName ||
      user.doctorProfile?.fullName ||
      user.hospitalProfile?.hospitalName ||
      'User';

    const resultUser = {
      id: user.id,
      medilockerId: user.medilockerId,
      email: user.email,
      name,
      role: user.role.toLowerCase(),
      phone: user.phone,
      bloodGroup: user.patientProfile?.bloodGroup || 'Not specified',
      allergies: user.patientProfile?.baselineAllergies ? [user.patientProfile.baselineAllergies] : [],
      chronicConditions: user.patientProfile?.medicalHistory ? [user.patientProfile.medicalHistory] : [],
      emergencyContact: {
        name: user.patientProfile?.emergencyContactName || 'Not configured',
        phone: user.phone,
        relation: 'Family',
      },
    };

    // Cache user profile and unit details in-memory/Redis immediately
    cacheService.setUserProfile(user.id, resultUser, 600);
    cacheService.setUserByUnit(user.medilockerId, resultUser, 900);

    return {
      token,
      user: resultUser,
    };
  }

  /**
   * Change existing MPIN
   */
  static async changeMpin(userId: string, oldMpin: string, newMpin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mpinHash) {
      throw new AppError('MPIN not configured for this account.', 400);
    }

    const isValid = await argon2.verify(user.mpinHash, oldMpin);
    if (!isValid) {
      throw new AppError('Current MPIN is incorrect.', 401);
    }

    const newHash = await argon2.hash(newMpin, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { mpinHash: newHash },
    });

    return { success: true, message: 'MPIN updated successfully.' };
  }

  /**
   * WebAuthn Biometric Registration: Generate Options
   */
  static async getWebAuthnRegisterOptions(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const options = await generateRegistrationOptions({
      rpName: env.WEBAUTHN_RP_NAME,
      rpID: env.WEBAUTHN_RP_ID,
      userID: user.id,
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    webauthnChallenges.set(user.id, options.challenge);

    return options;
  }

  /**
   * WebAuthn Biometric Registration: Verify Response
   */
  static async verifyWebAuthnRegister(userId: string, response: any) {
    const expectedChallenge = webauthnChallenges.get(userId);
    if (!expectedChallenge) {
      throw new AppError('Biometric verification challenge expired. Please retry.', 400);
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new AppError('Biometric registration verification failed.', 400);
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    await prisma.user.update({
      where: { id: userId },
      data: {
        webauthnCredentialId: Buffer.from(credentialID).toString('base64url'),
        webauthnPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        webauthnSignCount: counter,
      },
    });

    webauthnChallenges.delete(userId);

    return { success: true, message: 'Biometric fingerprint credential enrolled successfully.' };
  }

  /**
   * WebAuthn Biometric Login: Generate Options
   */
  static async getWebAuthnAuthOptions(medilockerId: string) {
    const user = await prisma.user.findUnique({
      where: { medilockerId: medilockerId.toUpperCase() },
    });

    if (!user || !user.webauthnCredentialId) {
      throw new AppError('Biometric authentication is not enrolled for this account.', 400);
    }

    const options = await generateAuthenticationOptions({
      rpID: env.WEBAUTHN_RP_ID,
      allowCredentials: [
        {
          id: Buffer.from(user.webauthnCredentialId, 'base64url'),
          type: 'public-key',
        },
      ],
      userVerification: 'preferred',
    });

    webauthnChallenges.set(user.id, options.challenge);

    return { options, userId: user.id };
  }

  /**
   * WebAuthn Biometric Login: Verify Assertion
   */
  static async verifyWebAuthnAuth(userId: string, response: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true },
    });

    if (!user || !user.webauthnPublicKey || !user.webauthnCredentialId) {
      throw new AppError('User biometric credentials not found.', 400);
    }

    const expectedChallenge = webauthnChallenges.get(userId);
    if (!expectedChallenge) {
      throw new AppError('Biometric login challenge expired.', 400);
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      authenticator: {
        credentialPublicKey: Buffer.from(user.webauthnPublicKey, 'base64url'),
        credentialID: Buffer.from(user.webauthnCredentialId, 'base64url'),
        counter: user.webauthnSignCount,
      },
    });

    if (!verification.verified) {
      throw new AppError('Biometric authentication failed.', 401);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { webauthnSignCount: verification.authenticationInfo.newCounter },
    });

    webauthnChallenges.delete(userId);

    const token = jwt.sign(
      {
        userId: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return {
      token,
      user: {
        id: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        name: user.patientProfile?.fullName || 'Patient',
        role: user.role,
      },
    };
  }

  /**
   * Get authenticated user profile (Accelerated with in-memory / Redis cache)
   */
  static async getMe(userId: string) {
    // 1. Fast Cache Lookup
    const cached = await cacheService.getUserProfile(userId);
    if (cached) {
      return cached;
    }

    // 2. Query Database via Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        doctorProfile: true,
        hospitalProfile: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const name =
      user.patientProfile?.fullName ||
      user.doctorProfile?.fullName ||
      user.hospitalProfile?.hospitalName ||
      'User';

    const result = {
      id: user.id,
      medilockerId: user.medilockerId,
      email: user.email,
      name,
      role: user.role.toLowerCase(),
      phone: user.phone,
      bloodGroup: user.patientProfile?.bloodGroup || 'Not specified',
      allergies: user.patientProfile?.baselineAllergies
        ? user.patientProfile.baselineAllergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      chronicConditions: user.patientProfile?.chronicConditions || [],
      emergencyContact: {
        name: user.patientProfile?.emergencyContactName || '',
        phone: user.patientProfile?.emergencyContactPhone || user.phone,
        relation: 'Family',
      },
    };

    // 3. Store in cache for continuous fast retrieval (10 minutes)
    cacheService.setUserProfile(userId, result, 600);
    cacheService.setUserByUnit(user.medilockerId, result, 900);

    return result;
  }

  /**
   * Update patient profile baselines and emergency contacts
   */
  static async updateProfile(userId: string, data: any) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true },
    });

    if (!user) throw new AppError('User not found', 404);

    if (user.role === UserRole.PATIENT) {
      const allergiesStr = Array.isArray(data.allergies)
        ? data.allergies.join(', ')
        : (data.allergies || data.baselineAllergies || '');
      const chronicList = Array.isArray(data.chronicConditions)
        ? data.chronicConditions
        : (data.chronicConditions ? String(data.chronicConditions).split(',').map((s: string) => s.trim()) : []);

      await prisma.patientProfile.upsert({
        where: { userId },
        update: {
          baselineAllergies: allergiesStr,
          chronicConditions: chronicList,
          emergencyContactName: data.emergencyContact?.name || data.emergencyContactName,
          emergencyContactPhone: data.emergencyContact?.phone || data.emergencyContactPhone,
        },
        create: {
          userId,
          fullName: data.name || user.email.split('@')[0],
          baselineAllergies: allergiesStr,
          chronicConditions: chronicList,
          emergencyContactName: data.emergencyContact?.name || '',
          emergencyContactPhone: data.emergencyContact?.phone || '',
        },
      });
    }

    // Invalidate stale cache immediately
    cacheService.invalidateUserProfile(userId);
    cacheService.invalidateUserByUnit(user.medilockerId);

    return this.getMe(userId);
  }
}

