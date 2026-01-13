import app from './app';
import { testConnection } from './config/database';

const PORT = process.env.PORT || 3000;

const startServer = async (): Promise<void> => {
  await testConnection();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
