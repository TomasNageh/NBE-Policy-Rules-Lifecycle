import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.info(`====================================================`);
  console.info(`  🏛️  National Bank of Egypt - Policy Management API`);
  console.info(`  📡  Running on: http://localhost:${env.PORT}`);
  console.info(`  🔍  Health Check: http://localhost:${env.PORT}/api/health`);
  console.info(`  ⚙️   Environment: ${env.NODE_ENV}`);
  console.info(`====================================================`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received. Closing HTTP server gracefully.');
  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });
});
