import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service';
import { prisma } from '../../database/prisma';
import { AppError } from '../../middlewares/errorHandler';

export class AIController {
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        throw new AppError('Message string is required.', 400);
      }

      const patient = await prisma.patientProfile.findUnique({
        where: { userId: req.user!.userId },
      }).catch(() => null);

      const homeSupplies = await prisma.medicineInventoryHome.findMany({
        where: { patientId: req.user!.userId },
      }).catch(() => []);

      const clinicalContext = {
        fullName: patient?.fullName || 'Patient',
        isPregnant: patient?.pregnancyStatus || false,
        recentAlcohol: patient?.alcoholUse || false,
        knownAllergies: patient?.baselineAllergies ? [patient.baselineAllergies] : [],
        chronicConditions: patient?.chronicConditions || [],
        homeSupplies: homeSupplies.map((h) => ({
          name: h.medicineName,
          activeSalt: h.activeSalt || undefined,
          quantity: h.quantityAvailable,
        })),
      };

      const result = await AIService.chatWithCompanion(message, clinicalContext);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async scanFoil(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('Foil image file is required.', 400);
      }
      const result = await AIService.analyzeFoil(req.file.buffer, req.file.mimetype);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
