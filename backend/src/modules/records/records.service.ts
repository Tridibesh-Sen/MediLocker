import crypto from 'crypto';
import { DocumentType, ProcessingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { uploadMedicalDocument } from '../../utils/storage';
import { AIService } from '../ai/ai.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../middlewares/errorHandler';

export class RecordsService {
  /**
   * Ingest and process a new medical prescription, report, or scan
   */
  static async uploadAndProcess(
    userId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
    note?: string
  ) {
    // 1. Calculate SHA-256 Checksum for tamper-evidence
    const sha256Checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 2. Upload to Cloudinary or Encrypted Local Vault
    const uploadResult = await uploadMedicalDocument(file.buffer, file.originalname, file.mimetype);

    // 3. Create Medical Record in DB
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: userId,
        originalFilename: file.originalname,
        storageKey: uploadResult.storageKey,
        mimeType: file.mimetype,
        fileSizeBytes: BigInt(uploadResult.bytes),
        sha256Checksum,
        documentType,
        userNote: note,
        processingStatus: ProcessingStatus.PROCESSING,
      },
    });

    logger.info(`Document uploaded: ${record.id} (${record.documentType}) for user ${userId}`);

    // 4. Trigger Medi-AI Vision / Clinical Document Extraction
    try {
      const extracted = await AIService.analyzeDocument(file.buffer, file.mimetype, file.originalname);

      // Create Timeline Event with strict ddmmyyyy format
      const timelineEvent = await prisma.timelineEvent.create({
        data: {
          recordId: record.id,
          patientId: userId,
          eventDateDdmmyyyy: extracted.eventDateDdmmyyyy,
          doctorName: extracted.doctorName,
          clinicName: extracted.clinicName,
          diagnoses: extracted.diagnoses,
          allergiesDetected: extracted.allergiesDetected,
          clinicalTestsDue: extracted.clinicalTestsDue,
          clinicalSummary: extracted.clinicalSummary,
        },
      });

      // If prescription, populate prescribed medications and active courses
      if (extracted.prescribedMedications && extracted.prescribedMedications.length > 0) {
        for (const med of extracted.prescribedMedications) {
          const startDate = med.courseStartDate ? new Date(med.courseStartDate) : new Date();
          const endDate = med.courseEndDate ? new Date(med.courseEndDate) : new Date(Date.now() + 5 * 86400000);

          const createdMed = await prisma.prescribedMedication.create({
            data: {
              timelineEventId: timelineEvent.id,
              patientId: userId,
              medicineName: med.medicineName,
              activeSalt: med.activeSalt,
              dosage: med.dosage || 'As directed',
              frequency: med.frequency || '1-0-1',
              route: med.route || 'Oral',
              timingInstruction: med.timingInstruction || 'After food',
              courseStartDate: startDate,
              courseEndDate: endDate,
              totalQuantityNeeded: Number(med.totalQuantityNeeded) || 10,
              isActive: true,
            },
          });

          // Create Today's To-Do task immediately for this new active medication
          await prisma.dailyTodoItem.create({
            data: {
              patientId: userId,
              medicationId: createdMed.id,
              scheduleDate: new Date(),
              timeSlot: 'MORNING',
              taskLabel: `${med.medicineName} - ${med.dosage} (${med.timingInstruction || 'Take as advised'})`,
              isCompleted: false,
            },
          });
        }
      }

      // Mark record as COMPLETED
      await prisma.medicalRecord.update({
        where: { id: record.id },
        data: { processingStatus: ProcessingStatus.COMPLETED },
      });

      logger.info(`Medi-AI extraction completed for record ${record.id}, timeline event ${timelineEvent.id}`);

      return {
        record: {
          ...record,
          fileSizeBytes: record.fileSizeBytes.toString(),
          url: uploadResult.url,
        },
        timelineEvent,
      };
    } catch (aiError: any) {
      logger.error(`Medi-AI extraction failed for record ${record.id}:`, aiError?.message);

      await prisma.medicalRecord.update({
        where: { id: record.id },
        data: { processingStatus: ProcessingStatus.FAILED },
      });

      return {
        record: {
          ...record,
          fileSizeBytes: record.fileSizeBytes.toString(),
          url: uploadResult.url,
        },
        error: 'Document stored, but clinical extraction experienced an issue.',
      };
    }
  }

  /**
   * Manually record a prescription or clinical document
   */
  static async createManualRecord(userId: string, data: any) {
    const docType = (data.category?.toUpperCase() === 'PRESCRIPTION'
      ? DocumentType.PRESCRIPTION
      : data.category?.toUpperCase() === 'LAB REPORT' || data.category?.toUpperCase() === 'REPORT'
      ? DocumentType.REPORT
      : DocumentType.OTHER) as DocumentType;

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: userId,
        originalFilename: `manual_entry_${Date.now()}.json`,
        storageKey: 'manual_submission',
        mimeType: 'application/json',
        fileSizeBytes: BigInt(0),
        sha256Checksum: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),
        documentType: docType,
        userNote: data.clinicalSummary || 'Manual patient submission',
        processingStatus: ProcessingStatus.COMPLETED,
      },
    });

    const diagnosesList = Array.isArray(data.diagnoses)
      ? data.diagnoses
      : [data.diagnoses || 'General Clinical Consultation'];

    const timelineEvent = await prisma.timelineEvent.create({
      data: {
        recordId: record.id,
        patientId: userId,
        eventDateDdmmyyyy: data.eventDateDdmmyyyy || '05092026',
        doctorName: data.doctorName || 'Dr. Not Specified',
        clinicName: data.clinicName || 'Personal Health Record',
        diagnoses: diagnosesList,
        allergiesDetected: data.allergiesDetected || [],
        clinicalTestsDue: data.clinicalTestsDue || data.testsDue || [],
        clinicalSummary: data.clinicalSummary || '',
      },
    });

    if (Array.isArray(data.prescribedMedications) && data.prescribedMedications.length > 0) {
      for (const med of data.prescribedMedications) {
        if (!med.medicineName) continue;
        const createdMed = await prisma.prescribedMedication.create({
          data: {
            timelineEventId: timelineEvent.id,
            patientId: userId,
            medicineName: med.medicineName,
            activeSalt: med.activeSalt,
            dosage: med.dosage || '1 tablet',
            frequency: med.frequency || '1-0-1',
            route: med.route || 'Oral',
            timingInstruction: med.timing || med.timingInstruction || 'After food',
            courseStartDate: new Date(),
            courseEndDate: new Date(Date.now() + 7 * 86400000),
            totalQuantityNeeded: Number(med.totalQuantityNeeded) || 10,
            isActive: true,
          },
        });

        // Add today's to-do task
        await prisma.dailyTodoItem.create({
          data: {
            patientId: userId,
            medicationId: createdMed.id,
            scheduleDate: new Date(),
            timeSlot: 'MORNING',
            taskLabel: `${med.medicineName} (${med.dosage || '1 tab'} - ${med.timing || 'After food'})`,
            isCompleted: false,
          },
        });
      }
    }

    return {
      record,
      timelineEvent,
    };
  }

  /**
   * List medical records with type filter
   */
  static async listRecords(userId: string, filter?: string) {
    const where: any = { patientId: userId };
    if (filter && filter !== 'all') {
      where.documentType = filter.toUpperCase() as DocumentType;
    }

    const records = await prisma.medicalRecord.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      include: {
        timelineEvent: {
          include: { prescribedMeds: true },
        },
      },
    });

    return records.map((r) => {
      const event = r.timelineEvent;
      return {
        id: r.id,
        category: r.documentType === 'PRESCRIPTION' ? 'Prescription' : r.documentType === 'REPORT' ? 'Lab Report' : 'Medical Record',
        dateFormatted: r.uploadedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        eventDateDdmmyyyy: event?.eventDateDdmmyyyy || '05092026',
        doctorName: event?.doctorName || 'Dr. Self-Entered',
        clinicName: event?.clinicName || 'Personal Vault',
        diagnoses: event?.diagnoses || ['General Record'],
        clinicalSummary: event?.clinicalSummary || r.userNote || 'Sovereign clinical record.',
        prescribedMedications: (event?.prescribedMeds || []).map((m) => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timingInstruction,
        })),
        testsDue: event?.clinicalTestsDue || [],
        storageKey: r.storageKey,
        mimeType: r.mimeType,
        uploadedAt: r.uploadedAt,
      };
    });
  }

  /**
   * Get single medical record details
   */
  static async getRecordById(recordId: string, userId: string) {
    const record = await prisma.medicalRecord.findFirst({
      where: { id: recordId, patientId: userId },
      include: {
        timelineEvent: {
          include: { prescribedMeds: true },
        },
      },
    });

    if (!record) {
      throw new AppError('Medical record not found.', 404);
    }

    return {
      ...record,
      fileSizeBytes: record.fileSizeBytes.toString(),
    };
  }
}
