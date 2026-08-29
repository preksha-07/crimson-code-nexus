import { pool } from './pool.js';
await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
await pool.end();
console.log('Database reset. Run npm run db:migrate then npm run db:seed.');
