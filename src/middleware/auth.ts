import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

/**
 * Middleware: Verify JWT token from Authorization header
 * Expected header format: Authorization: <token>
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers['authorization'];

  if (!token) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Access denied. No token provided.');
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token.');
  }
};

/**
 * Middleware: Require maintainer role
 */
export const requireMaintainer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'maintainer') {
    sendError(
      res,
      StatusCodes.FORBIDDEN,
      'Access denied. Maintainer role required.'
    );
    return;
  }
  next();
};
