import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/db.js';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  
  res.status(dbStatus ? 200 : 503).json({
    status: dbStatus ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'udyamflow-backend',
    version: '1.0.0',
    database: {
      engine: 'PostgreSQL',
      connected: dbStatus,
    },
  });
});

