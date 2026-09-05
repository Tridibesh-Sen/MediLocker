import { Router } from 'express';
import { DelegationController } from './delegation.controller';
import { authenticate, requireRole } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Provider request access via 9-digit patient ID
router.post(
  '/request-access',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.requestAccess
);

// Patient authorizes via MPIN / Biometric
router.post(
  '/authorize',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.authorizeAccess
);

// Hospital re-assigns patient to specific registered doctor
router.post(
  '/hospital/assign-doctor',
  authenticate,
  requireRole(UserRole.HOSPITAL),
  DelegationController.assignDoctor
);

// Doctor views active authorized patients
router.get(
  '/doctor/active-patients',
  authenticate,
  requireRole(UserRole.DOCTOR),
  DelegationController.getActivePatients
);

// Doctor opens patient records & symptom synopsis
router.get(
  '/doctor/patient/:patientId/records',
  authenticate,
  requireRole(UserRole.DOCTOR),
  DelegationController.getPatientRecords
);

export const delegationRoutes = router;
