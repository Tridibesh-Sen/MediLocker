import { Router } from 'express';
import { AIController } from './ai.controller';
import { authenticate } from '../../middlewares/auth';
import { uploadMiddleware } from '../../middlewares/upload';

const router = Router();

router.post('/chat', authenticate, AIController.chat);
router.post('/scan-foil', authenticate, uploadMiddleware.single('file'), AIController.scanFoil);

export const aiRoutes = router;
