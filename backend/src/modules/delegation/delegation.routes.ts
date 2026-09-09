import { Router } from 'express';
import { DelegationController } from './delegation.controller';
import { authenticate, requireRole } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Provider search patient by 9-digit Unit ID (returns ONLY Name and DOB)
router.get(
  '/search-patient',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.searchPatient
);
router.post(
  '/search-patient',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.searchPatient
);

// Provider sends access request with specified duration (30m to 7 days)
router.post(
  '/create-request',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.createRequest
);

// Doctor verifies 6-digit code provided by patient to unlock records
router.post(
  '/verify-code',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.verifyCode
);

// Patient checks incoming access requests and active delegations in Consent & Access tab
router.get(
  '/patient-requests',
  authenticate,
  requireRole(UserRole.PATIENT),
  DelegationController.getPatientRequests
);

// Patient or provider revokes delegation
router.post(
  '/revoke',
  authenticate,
  DelegationController.revokeDelegation
);

// Doctor views active authorized patient roster
router.get(
  '/doctor/active-patients',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.getActivePatients
);

// Doctor views full patient records & dashboard while active
router.get(
  '/doctor/patient/:patientId/full-data',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.getPatientFullData
);

export const delegationRoutes = router;
