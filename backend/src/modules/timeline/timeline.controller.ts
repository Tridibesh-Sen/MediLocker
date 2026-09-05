import { Request, Response, NextFunction } from 'express';
import { TimelineService } from './timeline.service';

export class TimelineController {
  static async getMyTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TimelineService.getPatientTimeline(req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TimelineService.getTimelineEventById(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
