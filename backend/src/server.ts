import './config/env';
import { app } from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './database/prisma';
import { startCronScheduler } from './workers/cronScheduler';
import { logger } from './utils/logger';

async function bootstrap() {
  // Check Database connection
  await checkDatabaseConnection();

  // Start Background Cron Schedulers
  startCronScheduler();

  // Start HTTP Server
  const server = app.listen(env.PORT, () => {
    logger.info(`=======================================================`);
    logger.info(`🏥 MediLocker Backend Server Running on Port ${env.PORT}`);
    logger.info(`📡 Health check: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`🔒 Environment: ${env.NODE_ENV}`);
    logger.info(`=======================================================`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Fatal startup error:', error);
  process.exit(1);
});
