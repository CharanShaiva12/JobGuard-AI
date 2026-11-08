/**
 * JobGuard AI - HTTP Server Startup
 * Module: backend.src.server
 */

import app from './app.js';
import { config } from './config/env.js';
import { testDbConnection } from './config/database.js';
import { runMigrations } from './utils/migrate.js';
import { AdminProvisionService } from './services/admin_provision.service.js';

async function bootstrap() {
  console.log('='.repeat(70));
  console.log('Starting JobGuard AI - Backend API Gateway');
  console.log('='.repeat(70));

  // Test MySQL 8.4 connection
  const dbStatus = await testDbConnection();
  console.log(`[Database] ${dbStatus.message}`);

  if (dbStatus.connected) {
    await runMigrations();
    await AdminProvisionService.ensureAdminAccount();
  }

  const server = app.listen(config.port, () => {
    console.log(`[Server] Listening on http://127.0.0.1:${config.port}`);
    console.log(`[Server] Environment: ${config.nodeEnv}`);
    console.log(`[Server] ML Microservice Target: ${config.mlServiceUrl}`);
    console.log(`[Server] Gemini Contextual AI: ${config.geminiApiKey ? 'Configured' : 'Offline / Unset'}`);
  });

  const shutdown = () => {
    console.log('\n[Server] Gracefully shutting down...');
    server.close(() => {
      console.log('[Server] Closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Bootstrap Error]:', err);
  process.exit(1);
});
