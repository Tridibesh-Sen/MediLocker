import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler, AppError } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { recordsRoutes } from './modules/records/records.routes';
import { timelineRoutes } from './modules/timeline/timeline.routes';
import { todoRoutes } from './modules/todo/todo.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { delegationRoutes } from './modules/delegation/delegation.routes';
import { TodoService } from './modules/todo/todo.service';

export const app = express();

// Security and utility middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve local upload fallback
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Root & Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'MediLocker Core API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Midnight Cron Webhook Trigger (for external services like cron-job.org or GitHub Actions)
app.post('/api/v1/cron/midnight-renewal', async (req: Request, res: Response, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${env.CRON_SECRET}`) {
      throw new AppError('Unauthorized cron trigger.', 401);
    }
    await TodoService.renewAllMidnightTodos();
    res.status(200).json({ success: true, message: 'Midnight To-Do renewal completed successfully.' });
  } catch (error) {
    next(error);
  }
});

// Functional API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/records', recordsRoutes);
app.use('/api/v1/timeline', timelineRoutes);
app.use('/api/v1/todo', todoRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/delegation', delegationRoutes);

// Static frontend serving
const frontendDir = path.resolve(process.cwd(), '../frontend');
app.use(express.static(frontendDir));

// Catch-all 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
  });
});

// Centralized error handler
app.use(errorHandler);
