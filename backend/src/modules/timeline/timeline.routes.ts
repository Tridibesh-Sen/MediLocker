import { Router } from 'express';
import { TimelineController } from './timeline.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.get('/', authenticate, TimelineController.getMyTimeline);
router.get('/:id', authenticate, TimelineController.getEventById);
router.delete('/:id', authenticate, TimelineController.delete);

export const timelineRoutes = router;
