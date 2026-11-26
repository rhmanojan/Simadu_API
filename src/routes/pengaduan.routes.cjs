const express = require('express');
const pengaduanController = require('../controllers/pengaduan.controller.cjs');
const { authenticate } = require('../middleware/auth.middleware.cjs');
const { authorizeRoles } = require('../middleware/authorize.middleware.cjs');
const {
  validateIdParam,
  validatePengaduanPayload,
  validateUpdateStatus
} = require('../middleware/validate.middleware.cjs');

const router = express.Router();

// Seluruh endpoint /api/pengaduan wajib terautentikasi Bearer Token
router.use(authenticate);

// GET /api/pengaduan - Mahasiswa (milik sendiri) & Admin (semua)
router.get('/', authorizeRoles('mahasiswa', 'admin'), pengaduanController.getAll);

// GET /api/pengaduan/:id - Mahasiswa (milik sendiri) & Admin (semua)
router.get('/:id', authorizeRoles('mahasiswa', 'admin'), validateIdParam, pengaduanController.getById);

// POST /api/pengaduan - Hanya Mahasiswa
router.post('/', authorizeRoles('mahasiswa'), validatePengaduanPayload, pengaduanController.create);

// PUT /api/pengaduan/:id - Hanya Mahasiswa pemilik (selama status 'diajukan')
router.put(
  '/:id',
  authorizeRoles('mahasiswa'),
  validateIdParam,
  validatePengaduanPayload,
  pengaduanController.update
);

// PATCH /api/pengaduan/:id/status - Hanya Admin
router.patch(
  '/:id/status',
  authorizeRoles('admin'),
  validateIdParam,
  validateUpdateStatus,
  pengaduanController.updateStatus
);

// DELETE /api/pengaduan/:id - Hanya Mahasiswa pemilik (selama status 'diajukan')
router.delete('/:id', authorizeRoles('mahasiswa'), validateIdParam, pengaduanController.remove);

module.exports = router;
