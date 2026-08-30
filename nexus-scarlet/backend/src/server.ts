import { app } from './app.js';
import { env } from './config/env.js';
import { initializeDatabase } from './db/init.js';

try {
  await initializeDatabase();
} catch (err) {
  console.error('[DATABASE] Fatal: Database initialization failed on startup:', err);
  process.exit(1);
}

app.listen(env.port, '0.0.0.0', () => {
  console.log(`NEXUS backend listening on port ${env.port}`);
});

