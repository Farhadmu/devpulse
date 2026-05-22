import { Router } from 'express';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
} from './issues.controller';
import { authenticate, requireMaintainer } from '../../middleware/auth';

const router = Router();

// GET  /api/issues        — Public
router.get('/', getAllIssues);

// GET  /api/issues/:id    — Public
router.get('/:id', getIssueById);

// POST /api/issues        — Authenticated (contributor | maintainer)
router.post('/', authenticate, createIssue);

// PATCH /api/issues/:id   — Authenticated (maintainer OR contributor own open issue)
router.patch('/:id', authenticate, updateIssue);

// DELETE /api/issues/:id  — Maintainer only
router.delete('/:id', authenticate, requireMaintainer, deleteIssue);

export default router;
