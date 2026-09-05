import { Request, Response, NextFunction } from 'express';
import { RecordsService } from './records.service';
import { DocumentType } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

export class RecordsController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('File is required for upload.', 400);
      }

      const documentType = (req.body.documentType?.toUpperCase() as DocumentType) || DocumentType.PRESCRIPTION;
      const note = req.body.note;

      const result = await RecordsService.uploadAndProcess(
        req.user!.userId,
        req.file,
        documentType,
        note
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filter = req.query.type as string;
      const result = await RecordsService.listRecords(req.user!.userId, filter);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.getRecordById(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
