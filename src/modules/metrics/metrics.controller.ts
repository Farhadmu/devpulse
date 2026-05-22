import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { query } from '../../utils/db';
import { sendSuccess } from '../../utils/response';

/**
 * GET /api/metrics
 * Internal system metrics — Maintainer only
 */
export const getMetrics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Total users & breakdown by role
    const usersResult = await query<{ role: string; count: string }>(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );

    // Total issues & breakdown by status
    const issuesByStatusResult = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM issues GROUP BY status`
    );

    // Breakdown by type
    const issuesByTypeResult = await query<{ type: string; count: string }>(
      `SELECT type, COUNT(*) as count FROM issues GROUP BY type`
    );

    // Total counts
    const totalUsersResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users`
    );

    const totalIssuesResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM issues`
    );

    // Build role map
    const usersByRole: Record<string, number> = { contributor: 0, maintainer: 0 };
    usersResult.rows.forEach((r) => {
      usersByRole[r.role] = parseInt(r.count, 10);
    });

    // Build status map
    const issuesByStatus: Record<string, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
    };
    issuesByStatusResult.rows.forEach((r) => {
      issuesByStatus[r.status] = parseInt(r.count, 10);
    });

    // Build type map
    const issuesByType: Record<string, number> = {
      bug: 0,
      feature_request: 0,
    };
    issuesByTypeResult.rows.forEach((r) => {
      issuesByType[r.type] = parseInt(r.count, 10);
    });

    sendSuccess(res, StatusCodes.OK, 'System metrics retrieved successfully', {
      users: {
        total: parseInt(totalUsersResult.rows[0].count, 10),
        by_role: usersByRole,
      },
      issues: {
        total: parseInt(totalIssuesResult.rows[0].count, 10),
        by_status: issuesByStatus,
        by_type: issuesByType,
      },
    });
  } catch (err) {
    next(err);
  }
};
