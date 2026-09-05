import { Router } from 'express';
import { RecordsController } from './records.controller';
import { authenticate } from '../../middlewares/auth';
import { uploadMiddleware } from '../../middlewares/upload';

const router = Router();

router.post('/upload', authenticate, uploadMiddleware.single('file'), RecordsController.upload);
router.post('/', authenticate, RecordsController.createManual);
router.get('/', authenticate, RecordsController.list);
router.get('/:id', authenticate, RecordsController.getById);

export const recordsRoutes = router;
