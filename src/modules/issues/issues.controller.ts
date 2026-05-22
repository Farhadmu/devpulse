import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { query } from '../../utils/db';
import { sendSuccess, sendError } from '../../utils/response';
import {
  Issue,
  IssueWithReporter,
  CreateIssueBody,
  UpdateIssueBody,
  IssueType,
  IssueStatus,
} from '../../types';

const VALID_TYPES: IssueType[] = ['bug', 'feature_request'];
const VALID_STATUSES: IssueStatus[] = ['open', 'in_progress', 'resolved'];

// ─── Helper: attach reporter info to issues ────────────────────────────────────

async function attachReporters(issues: Issue[]): Promise<IssueWithReporter[]> {
  if (issues.length === 0) return [];

  // Batch fetch reporters with WHERE id IN (...)
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  const placeholders = reporterIds.map((_, idx) => `$${idx + 1}`).join(', ');

  const reporterResult = await query<{
    id: number;
    name: string;
    role: 'contributor' | 'maintainer';
  }>(
    `SELECT id, name, role FROM users WHERE id IN (${placeholders})`,
    reporterIds
  );

  // Build a map for O(1) lookups
  const reporterMap = new Map(reporterResult.rows.map((r) => [r.id, r]));

  return issues.map(({ reporter_id, ...rest }) => ({
    ...rest,
    reporter: reporterMap.get(reporter_id) ?? {
      id: reporter_id,
      name: 'Unknown',
      role: 'contributor' as const,
    },
  }));
}

// ─── POST /api/issues ─────────────────────────────────────────────────────────

export const createIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, type } = req.body as CreateIssueBody;
    const reporterId = req.user!.id;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!title || !description || !type) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title, description, and type are required.');
      return;
    }

    if (title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must not exceed 150 characters.');
      return;
    }

    if (description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }

    if (!VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request.');
      return;
    }

    // ── Validate reporter exists ─────────────────────────────────────────────
    const userCheck = await query<{ id: number }>(
      'SELECT id FROM users WHERE id = $1',
      [reporterId]
    );
    if (userCheck.rows.length === 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Reporter user does not exist.');
      return;
    }

    // ── Insert issue ─────────────────────────────────────────────────────────
    const result = await query<Issue>(
      `INSERT INTO issues (title, description, type, reporter_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, description, type, reporterId]
    );

    sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/issues ──────────────────────────────────────────────────────────

export const getAllIssues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sort = 'newest', type, status } = req.query as {
      sort?: string;
      type?: string;
      status?: string;
    };

    // ── Build dynamic WHERE clauses ──────────────────────────────────────────
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (type) {
      if (!VALID_TYPES.includes(type as IssueType)) {
        sendError(res, StatusCodes.BAD_REQUEST, 'type filter must be bug or feature_request.');
        return;
      }
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as IssueStatus)) {
        sendError(res, StatusCodes.BAD_REQUEST, 'status filter must be open, in_progress, or resolved.');
        return;
      }
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderClause = sort === 'oldest' ? 'ORDER BY created_at ASC' : 'ORDER BY created_at DESC';

    const result = await query<Issue>(
      `SELECT * FROM issues ${whereClause} ${orderClause}`,
      params
    );

    const issuesWithReporters = await attachReporters(result.rows);

    sendSuccess(res, StatusCodes.OK, 'Issues retrieved successfully', issuesWithReporters);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/issues/:id ──────────────────────────────────────────────────────

export const getIssueById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query<Issue>('SELECT * FROM issues WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const [issueWithReporter] = await attachReporters(result.rows);

    sendSuccess(res, StatusCodes.OK, 'Issue retrieved successfully', issueWithReporter);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/issues/:id ────────────────────────────────────────────────────

export const updateIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, type, status } = req.body as UpdateIssueBody;
    const currentUser = req.user!;

    // ── Fetch existing issue ─────────────────────────────────────────────────
    const existing = await query<Issue>('SELECT * FROM issues WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    const issue = existing.rows[0];

    // ── Permission check ─────────────────────────────────────────────────────
    if (currentUser.role === 'contributor') {
      // Contributors can only edit their own issues and only if status is open
      if (issue.reporter_id !== currentUser.id) {
        sendError(res, StatusCodes.FORBIDDEN, 'You can only update your own issues.');
        return;
      }
      if (issue.status !== 'open') {
        sendError(
          res,
          StatusCodes.CONFLICT,
          'Contributors can only edit issues with open status.'
        );
        return;
      }
      // Contributors cannot change status
      if (status !== undefined) {
        sendError(res, StatusCodes.FORBIDDEN, 'Contributors cannot change issue status.');
        return;
      }
    }

    // ── Input validation ─────────────────────────────────────────────────────
    if (title !== undefined && title.length > 150) {
      sendError(res, StatusCodes.BAD_REQUEST, 'title must not exceed 150 characters.');
      return;
    }

    if (description !== undefined && description.length < 20) {
      sendError(res, StatusCodes.BAD_REQUEST, 'description must be at least 20 characters.');
      return;
    }

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'type must be bug or feature_request.');
      return;
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      sendError(res, StatusCodes.BAD_REQUEST, 'status must be open, in_progress, or resolved.');
      return;
    }

    // ── Build dynamic SET clause ─────────────────────────────────────────────
    const updates: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) { params.push(title); updates.push(`title = $${params.length}`); }
    if (description !== undefined) { params.push(description); updates.push(`description = $${params.length}`); }
    if (type !== undefined) { params.push(type); updates.push(`type = $${params.length}`); }
    if (status !== undefined) { params.push(status); updates.push(`status = $${params.length}`); }

    if (updates.length === 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'No fields provided to update.');
      return;
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query<Issue>(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/issues/:id ───────────────────────────────────────────────────

export const deleteIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await query<Issue>('SELECT id FROM issues WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      sendError(res, StatusCodes.NOT_FOUND, 'Issue not found.');
      return;
    }

    await query('DELETE FROM issues WHERE id = $1', [id]);

    sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (err) {
    next(err);
  }
};
