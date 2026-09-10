import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { RecordsService } from './records.service';
import { DocumentType } from '@prisma/client';
import { AppError } from '../../middlewares/errorHandler';

export class RecordsController {
  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('File is required for upload.', 400);
      }

      const docTypeStr = (req.body.documentType || '').toUpperCase();
      const documentType: DocumentType =
        docTypeStr === 'REPORT' || docTypeStr.includes('REPORT') || docTypeStr.includes('LAB')
          ? DocumentType.REPORT
          : docTypeStr === 'SCAN'
          ? DocumentType.SCAN
          : docTypeStr === 'PRESCRIPTION'
          ? DocumentType.PRESCRIPTION
          : DocumentType.OTHER;
      const note = req.body.note;
      const eventDate = req.body.eventDate || req.body.docDate;
      const isMedicineStillNeeded =
        req.body.isMedicineStillNeeded !== undefined
          ? String(req.body.isMedicineStillNeeded).toLowerCase() !== 'false'
          : true;
      const doctorUnitId = req.body.doctorUnitId;

      const result = await RecordsService.uploadAndProcess(
        req.user!.userId,
        req.file,
        documentType,
        note,
        eventDate,
        isMedicineStillNeeded,
        doctorUnitId
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async viewFile(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await RecordsService.getSecureRecordView(
        req.user!.userId,
        req.user!.role,
        req.params.id
      );

      // If fileUrl is a remote URL (Supabase/Cloudinary)
      if (record.fileUrl && (record.fileUrl.startsWith('http://') || record.fileUrl.startsWith('https://'))) {
        return res.redirect(record.fileUrl);
      }

      // If storageKey is a local path
      if (record.storageKey && fs.existsSync(record.storageKey)) {
        res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${record.originalFilename}"`);
        return fs.createReadStream(record.storageKey).pipe(res);
      }

      // If stored relative in uploads
      const uploadsFallback = path.join(process.cwd(), 'uploads', record.originalFilename);
      if (fs.existsSync(uploadsFallback)) {
        res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${record.originalFilename}"`);
        return fs.createReadStream(uploadsFallback).pipe(res);
      }

      if (record.fileUrl) {
        return res.redirect(record.fileUrl);
      }

      throw new AppError('File content is not accessible on server.', 404);
    } catch (error) {
      next(error);
    }
  }

  static async createManual(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.createManualRecord(req.user!.userId, req.body);
      res.status(201).json({ success: true, record: result.record, timelineEvent: result.timelineEvent });
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

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecordsService.deleteRecord(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}
