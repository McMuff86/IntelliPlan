import app from './app';
import { testConnection } from './config/database';
import logger from './config/logger';
import type { Server } from 'http';

const PREFERRED_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

const tryListen = (port: number, attempt: number): Promise<Server> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
      .on('listening', () => {
        logger.info({ port, env: process.env.NODE_ENV || 'development' }, 'Server running');
        resolve(server);
      })
      .on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
          const nextPort = port + 1;
          logger.warn({ port, nextPort }, `Port ${port} in use, trying ${nextPort}`);
          server.close();
          resolve(tryListen(nextPort, attempt + 1));
        } else {
          reject(err);
        }
      });
  });
};

const startServer = async (): Promise<void> => {
  await testConnection();
  await tryListen(PREFERRED_PORT, 1);
};

startServer().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
