import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { generateMediLockerId } from '../../utils/idGenerator';
import { AppError } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';
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
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    }).catch(() => null);

    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // Generate unique 9-digit MediLocker Unit ID
    let unitId = generateMediLockerId();
    let collisionCheck = await prisma.user.findUnique({ where: { medilockerId: unitId } }).catch(() => null);
    while (collisionCheck) {
      unitId = generateMediLockerId();
      collisionCheck = await prisma.user.findUnique({ where: { medilockerId: unitId } }).catch(() => null);
    }

    // Create User record
    const user = await prisma.user.create({
      data: {
        medilockerId: unitId,
        email: data.email.toLowerCase(),
        phone: data.phone,
        role: data.role,
        isVerified: data.role === UserRole.PATIENT, // Doctors/hospitals require verification
      },
    });

    // Create Role-Specific Profile
    if (data.role === UserRole.PATIENT) {
      await prisma.patientProfile.create({
        data: {
          userId: user.id,
          fullName: data.name,
          dob: data.dob ? new Date(data.dob) : null,
          gender: data.gender,
          bloodGroup: data.blood,
          insuranceProvider: data.insurance,
          baselineAllergies: data.allergy,
          baselineMedications: data.medications,
          medicalHistory: data.history,
          emergencyContactName: data.emergency,
          addressLine: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
        },
      });
    } else if (data.role === UserRole.DOCTOR) {
      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          fullName: data.name,
          professionalEmail: data.email.toLowerCase(),
          phone: data.phone,
          institutionalDoctorId: data.doctorId,
          registrationNumber: data.registrationNumber,
          specialization: data.specialization,
          registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
          yearsExperience: Number(data.experience) || 0,
          clinicName: data.clinicName,
          clinicVerificationRef: data.clinicVerification,
          clinicAddress: data.address,
          city: data.city,
          state: data.state,
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

    return {
      userId: user.id,
      medilockerId: user.medilockerId,
      email: user.email,
      role: user.role,
      message: 'Account created successfully. Please configure your 6-digit MPIN or Biometrics.',
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
      memoryCost: 2 ** 16, // 64 MB
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
   * Authenticate via Email + Unit ID + MPIN
   */
  static async login(email: string, medilockerId: string, role: UserRole, mpin?: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        medilockerId: medilockerId.toUpperCase(),
      },
      include: {
        patientProfile: true,
        doctorProfile: true,
        hospitalProfile: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid credentials. Check your email and Unit ID.', 401);
    }

    if (user.role !== role) {
      throw new AppError(`This account belongs to the ${user.role} portal. Please select the correct portal.`, 403);
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

    return {
      token,
      user: {
        id: user.id,
        medilockerId: user.medilockerId,
        email: user.email,
        name,
        role: user.role,
      },
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
}
