import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.header('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', id);
  res.locals.requestId = id;
  next();
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let e: HttpError;
  if (err instanceof HttpError) {
    e = err;
  } else if (err instanceof ZodError) {
    e = new HttpError(422, 'VALIDATION_ERROR', 'Request validation failed', {
      issues: err.issues
    });
  } else {
    console.error('[INTERNAL_ERROR]', err);
    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    e = new HttpError(500, 'INTERNAL_ERROR', 'Unexpected server failure');
  }

  res.status(e.status).json({
    error: {
      code: e.code,
      message: e.message,
      details: e.details,
      requestId: res.locals.requestId
    }
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route does not exist.',
      details: {},
      requestId: res.locals.requestId
    }
  });
}
