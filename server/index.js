/**
 * Visualizer Backend Server
 *
 * Bietet FFmpeg-basierte Video-Verarbeitung für bessere Aufnahmequalität.
 * Läuft auf Port 9006 (hinter NGINX Proxy).
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9006;

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

// CORS für Cross-Origin Requests
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Body Parser für JSON und große Video-Uploads (4 GB für 4K Videos)
app.use(express.json({ limit: '4gb' }));
app.use(express.urlencoded({ extended: true, limit: '4gb' }));

// Request Logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════
// STATIC FILES
// ═══════════════════════════════════════════════════════════════════

// Uploads/Files Verzeichnis
const uploadsDir = path.join(__dirname, 'uploads');
const filesDir = path.join(__dirname, 'files');

// Stelle sicher, dass Verzeichnisse existieren
async function ensureDirectories() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(filesDir, { recursive: true });
    console.log('✅ Upload-Verzeichnisse bereit');
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Verzeichnisse:', error);
  }
}

// Static file serving für verarbeitete Videos
app.use('/files', express.static(filesDir, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
}));

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

// Health Check (für NGINX und Monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api', apiRoutes);

// ═══════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ═══════════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════════

async function startServer() {
  await ensureDirectories();

  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🎬 Visualizer Backend Server`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🕐 Started: ${new Date().toISOString()}`);
    console.log(`📁 Files: ${filesDir}`);
    console.log(`📤 Uploads: ${uploadsDir}`);
    console.log('═══════════════════════════════════════════════════════');
  });
}

startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM empfangen - Server wird beendet...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT empfangen - Server wird beendet...');
  process.exit(0);
});

export default app;
