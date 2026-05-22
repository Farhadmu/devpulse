import { Response } from 'express';

/**
 * Send a standardized success response
 */
export const sendSuccess = (
  res: Response,
  statusCode: number,
  message: string,
  data?: unknown
): void => {
  const body: Record<string, unknown> = { success: true, message };
  if (data !== undefined) body.data = data;
  res.status(statusCode).json(body);
};

/**
 * Send a standardized error response
 */
export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown
): void => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors !== undefined) body.errors = errors;
  res.status(statusCode).json(body);
};
