import { Router } from 'express';
import { getMetrics } from './metrics.controller';
import { authenticate, requireMaintainer } from '../../middleware/auth';

const router = Router();

// GET /api/metrics — Maintainer only
router.get('/', authenticate, requireMaintainer, getMetrics);

export default router;
