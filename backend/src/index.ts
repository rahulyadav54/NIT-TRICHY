import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { masterRouter } from './modules/master/master.routes.js';
import { bomRouter } from './modules/bom/bom.routes.js';
import { purchaseRouter } from './modules/purchase/purchase.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { productionRouter } from './modules/production/production.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { invoiceRouter } from './modules/invoice/invoice.routes.js';
import { dispatchRouter } from './modules/dispatch/dispatch.routes.js';
import { paymentRouter } from './modules/payment/payment.routes.js';
import { costingRouter } from './modules/costing/costing.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';

const app = express();

// Security and utility middlewares
app.use(cors({
  origin: process.env.VERCEL ? true : config.clientUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/master', masterRouter);
app.use('/api/bom', bomRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/production', productionRouter);
app.use('/api/sales', salesRouter);
app.use('/api/invoice', invoiceRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/costing', costingRouter);
app.use('/api/reports', reportRouter);

// Welcome / Root index
app.get('/api', (req, res) => {
  res.json({
    name: 'UdyamFlow ERP API',
    tagline: 'From Order to Audit. Everything Connected.',
    institution: 'NIT Tiruchirappalli',
    version: '1.0.0',
  });
});

// Centralized error handling middleware
app.use(errorHandler);

if (
  process.env.NODE_ENV !== 'test' &&
  !process.env.JEST_WORKER_ID &&
  !process.argv[1]?.includes('test') &&
  !process.env.VERCEL
) {
  app.listen(config.port, () => {
    console.log(`🚀 UdyamFlow ERP Backend running on http://localhost:${config.port}`);
    console.log(`📊 Health check available at http://localhost:${config.port}/api/health`);
  });
}

export default app;

