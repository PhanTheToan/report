import cors from 'cors';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import findingsRouter from './routes/findings.js';
import healthRouter from './routes/health.js';
import reportsRouter from './routes/reports.js';
import uploadRouter from './routes/upload.js';
import { ensureUploadDirectory, UPLOAD_DIR } from './utils/paths.js';

ensureUploadDirectory();

const app = express();

app.use(
  cors({
    origin: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/health', healthRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/findings', findingsRouter);
app.use('/api/upload', uploadRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
