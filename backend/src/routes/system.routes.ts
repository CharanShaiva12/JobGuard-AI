/**
 * JobGuard AI - System Diagnostics & Status Routes
 * Module: backend.src.routes.system.routes
 */

import { Router, Request, Response } from 'express';
import { SystemStatusService } from '../services/system_status.service.js';

const router = Router();

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await SystemStatusService.getStatus();
    res.status(200).json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
