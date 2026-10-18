import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import sponsorRoutes from './routes/sponsorRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import negotiationRoutes from './routes/negotiationRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import agreementRoutes from './routes/agreementRoutes.js';
import fulfilmentRoutes from './routes/fulfilmentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import committeeRoutes from './routes/committeeRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swaggerSpec.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'c34-sponsorship-desk' });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/negotiations', negotiationRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/fulfilment', fulfilmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/committees', committeeRoutes);
app.use('/api/conversations', conversationRoutes);

app.use(errorMiddleware);

export default app;
