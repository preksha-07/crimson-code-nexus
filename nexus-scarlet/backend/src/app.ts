import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestId, errorHandler, notFound } from './shared/http.js';
import { query } from './db/pool.js';
import { issueRouter } from './issues/routes.js';
import { projectRouter } from './projects/routes.js';
import { commentRouter } from './comments/routes.js';
import { dependencyRouter } from './dependencies/routes.js';
import { attachmentRouter } from './attachments/routes.js';
import { releaseRouter } from './releases/routes.js';
import { intelligenceRouter } from './intelligence/routes.js';
import { authenticateSession } from './security/auth/middleware.js';
import { authRouter } from './security/auth/routes.js';
import { requireCsrf } from './security/auth/csrf.js';
export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(authenticateSession);
app.use(requireCsrf);

app.get('/health', async (_req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', service: 'nexus-backend' });
  } catch (e) {
    next(e);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/issues', issueRouter);
app.use('/api/projects', projectRouter);
app.use('/api', commentRouter);
app.use('/api', dependencyRouter);
app.use('/api', attachmentRouter);
app.use('/api/releases', releaseRouter);
app.use('/api', intelligenceRouter);

app.use(notFound);
app.use(errorHandler);
