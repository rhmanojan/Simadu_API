const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./src/routes/auth.routes.cjs');
const pengaduanRoutes = require('./src/routes/pengaduan.routes.cjs');
const { loggerMiddleware } = require('./src/middleware/logger.middleware.cjs');
const { optionalApiKeyGuard } = require('./src/middleware/auth.middleware.cjs');
const { notFoundHandler, errorHandler } = require('./src/middleware/error.middleware.cjs');

const app = express();

// Muat spesifikasi OpenAPI 3.0 dari docs/openapi.json
const openApiPath = path.join(__dirname, 'docs', 'openapi.json');
const openApiDocument = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));

// Header keamanan HTTP (CSP disesuaikan agar Swagger UI tampil normal)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io']
      }
    }
  })
);

app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(loggerMiddleware);

// Endpoint informasi dasar & kesehatan layanan
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Selamat datang di SIMADU API (Sistem Layanan Informasi dan Pengaduan Mahasiswa).',
    data: {
      service: 'SIMADU API',
      version: '1.0.0',
      documentation: '/api-docs',
      openApiSpec: '/api-docs.json'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SIMADU API berjalan normal.',
    data: {
      status: 'OK',
      timestamp: new Date().toISOString()
    }
  });
});

// Dokumentasi OpenAPI & Swagger UI
app.get('/api-docs.json', (_req, res) => {
  res.status(200).json(openApiDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'SIMADU API — Swagger Documentation'
  })
);

// Opsional API Key guard untuk rute API (aktif hanya jika REQUIRE_API_KEY=true)
app.use('/api', optionalApiKeyGuard);

// Rute utama REST API
app.use('/api/auth', authRoutes);
app.use('/api/pengaduan', pengaduanRoutes);

// Penanganan 404 & Error Handler terpusat
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
