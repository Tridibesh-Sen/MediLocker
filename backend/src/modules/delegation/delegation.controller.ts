import { Request, Response, NextFunction } from 'express';
import { DelegationService } from './delegation.service';
import { AuthMethod, UserRole } from '@prisma/client';
import { z } from 'zod';

const authorizeSchema = z.object({
  patientMedilockerId: z.string().min(1),
  authMethod: z.nativeEnum(AuthMethod),
  mpin: z.string().optional(),
  allottedDoctorId: z.string().uuid().optional(),
});

const assignDoctorSchema = z.object({
  delegationId: z.string().uuid(),
  doctorId: z.string().uuid(),
});

export class DelegationController {
  static async requestAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientMedilockerId } = req.body;
      const result = await DelegationService.requestAccess(req.user!.userId, patientMedilockerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async authorizeAccess(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientMedilockerId, authMethod, mpin, allottedDoctorId } = authorizeSchema.parse(req.body);
      const result = await DelegationService.authorizeAccess(
        req.user!.userId,
        req.user!.role,
        patientMedilockerId,
        authMethod,
        mpin,
        allottedDoctorId
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async assignDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const { delegationId, doctorId } = assignDoctorSchema.parse(req.body);
      const result = await DelegationService.assignDoctor(req.user!.userId, delegationId, doctorId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getActivePatients(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DelegationService.getDoctorActivePatients(req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPatientRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DelegationService.getAuthorizedPatientRecords(req.user!.userId, req.params.patientId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
