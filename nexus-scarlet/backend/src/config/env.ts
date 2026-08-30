import 'dotenv/config';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

function getCorsOrigin(): string | string[] {
  if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
    return origins.length === 1 ? origins[0] : origins;
  }
  return defaultCorsOrigins;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://nexus:nexus@localhost:5432/nexus',
  corsOrigin: getCorsOrigin()
};

