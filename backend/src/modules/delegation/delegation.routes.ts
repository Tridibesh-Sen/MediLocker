import { Router } from 'express';
import { DelegationController } from './delegation.controller';
import { authenticate, requireRole } from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

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

router.post(
  '/create-request',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.createRequest
);

router.post(
  '/verify-code',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.verifyCode
);

router.get(
  '/patient-requests',
  authenticate,
  requireRole(UserRole.PATIENT),
  DelegationController.getPatientRequests
);

router.post(
  '/revoke',
  authenticate,
  DelegationController.revokeDelegation
);

router.get(
  '/doctor/active-patients',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.getActivePatients
);

router.get(
  '/provider/pending-requests',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.getProviderPendingRequests
);

router.get(
  '/doctor/patient/:patientId/full-data',
  authenticate,
  requireRole(UserRole.DOCTOR, UserRole.HOSPITAL),
  DelegationController.getPatientFullData
);

export const delegationRoutes = router;
