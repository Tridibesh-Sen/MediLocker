import { prisma } from '../../database/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { cacheService } from '../../utils/cache';

export class TimelineService {
  /**
   * Get patient chronological timeline events (Accelerated with cache)
   */
  static async getPatientTimeline(patientUserId: string) {
    const cacheKey = `timeline:${patientUserId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const events = await prisma.timelineEvent.findMany({
      where: { patientId: patientUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        record: true,
        prescribedMeds: true,
      },
    });

    // Also fetch feeling logs to build the doctor symptom synopsis
    const feelingLogs = await prisma.dailyFeelingLog.findMany({
      where: { patientId: patientUserId },
      orderBy: { logDate: 'desc' },
      take: 30, // Last 30 days
    });

    const result = {
      timeline: events.map((e) => ({
        id: e.id,
        eventDateDdmmyyyy: e.eventDateDdmmyyyy,
        doctorName: e.doctorName,
        clinicName: e.clinicName,
        diagnoses: e.diagnoses,
        allergiesDetected: e.allergiesDetected,
        clinicalTestsDue: e.clinicalTestsDue,
        clinicalSummary: e.clinicalSummary,
        prescribedMedications: e.prescribedMeds,
        sourceDocument: {
          id: e.record.id,
          filename: e.record.originalFilename,
          mimeType: e.record.mimeType,
          documentType: e.record.documentType,
        },
      })),
      symptomSynopsis: feelingLogs.map((f) => ({
        date: f.logDate.toISOString().split('T')[0],
        severityColor: f.severityColor, // GREEN, ORANGE, RED
        feelingScore: f.feelingScore,
        feedback: f.patientFeedback,
      })),
    };

    // Cache timeline for 5 minutes
    cacheService.set(cacheKey, result, 300);

    return result;
  }

  /**
   * Get single timeline card drill-down
   */
  static async getTimelineEventById(eventId: string, userId: string) {
    const event = await prisma.timelineEvent.findFirst({
      where: { id: eventId },
      include: {
        record: true,
        prescribedMeds: true,
      },
    });

    if (!event) {
      throw new AppError('Timeline event not found.', 404);
    }

    return event;
  }
}
