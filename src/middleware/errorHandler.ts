import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { sendError } from '../utils/response';

/**
 * Centralized error-handling middleware.
 * Catches both sync and async errors forwarded via next(err).
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  console.error('❌ Unhandled error:', err.message);

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'An unexpected server error occurred.',
    process.env.NODE_ENV === 'development' ? err.message : undefined
  );
};
