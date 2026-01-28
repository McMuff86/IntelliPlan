import app from './app';
import { testConnection } from './config/database';
import logger from './config/logger';

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  await testConnection();
  
  app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Server running');
  });
};

startServer().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
