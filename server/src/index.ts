import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { getDb } from './db/index.js';
import { seedDatabase } from './db/seed.js';

import authRouter from './routes/auth.js';
import preferencesRouter from './routes/preferences.js';
import subjectsRouter from './routes/subjects.js';
import topicsRouter from './routes/topics.js';
import sessionsRouter from './routes/sessions.js';
import quizzesRouter from './routes/quizzes.js';
import apisRouter from './routes/apis.js';
import dashboardRouter from './routes/dashboard.js';
import materialsRouter from './routes/materials.js';
import adaptiveRouter from './routes/adaptive.js';
import weaknessesRouter from './routes/weaknesses.js';
import revisionRouter from './routes/revision.js';
import analyticsRouter from './routes/analytics.js';

import projectsRouter from './routes/projects.js';
import documentsRouter from './routes/documents.js';
import syllabusRouter from './routes/syllabus.js';
import lessonsRouter from './routes/lessons.js';
import resourcesRouter from './routes/resources.js';
import integrationsRouter from './routes/integrations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-Session']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    application: 'LearnSphere API',
    academicProject: 'CSE279',
    phase: 'Document-First Architecture & Public API Ecosystem Active',
    timestamp: new Date().toISOString()
  });
});

// Phase 1 API Routes
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/external', apisRouter);
app.use('/api/dashboard', dashboardRouter);

// Phase 2 Intelligence & Learning Routes
app.use('/api/materials', materialsRouter);
app.use('/api/adaptive', adaptiveRouter);
app.use('/api/weaknesses', weaknessesRouter);
app.use('/api/revision', revisionRouter);
app.use('/api/analytics', analyticsRouter);

// Document-First & Public API Ecosystem Routes
app.use('/api/projects', projectsRouter);
app.use('/api', documentsRouter);
app.use('/api/syllabus', syllabusRouter);
app.use('/api', syllabusRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/integrations', integrationsRouter);

// Serve client static build in production
const clientDistPath = path.resolve(process.cwd(), 'dist/client');
app.use(express.static(clientDistPath));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('LearnSphere frontend is building. Please run the client development server.');
    }
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[LearnSphere Error Handler]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error occurred'
  });
});

// Database Initialization and Startup
async function startServer() {
  try {
    await getDb();
    await seedDatabase();
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`  LearnSphere Academic API Server (CSE279)`);
        console.log(`  Running on: http://localhost:${PORT}`);
        console.log(`  Health:     http://localhost:${PORT}/api/health`);
        console.log(`====================================================`);
      });
    }
  } catch (err) {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  }
}

// Only auto-start when not imported in tests
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
export default app;
