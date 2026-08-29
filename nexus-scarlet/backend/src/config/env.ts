import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://nexus:nexus@localhost:5432/nexus',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173'
};
