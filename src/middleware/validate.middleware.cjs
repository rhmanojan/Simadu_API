const { AppError } = require('./error.middleware.cjs');

const ALLOWED_KATEGORI = Object.freeze(['Fasilitas', 'Akademik', 'TI']);
const ALLOWED_STATUS = Object.freeze(['diajukan', 'diproses', 'selesai']);

/**
 * Memastikan request body adalah plain JSON object yang valid.
 */
function ensureJsonBodyObject(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new AppError(400, 'Header Content-Type harus menggunakan application/json.');
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body harus berupa objek JSON yang valid.');
  }
}

/**
 * Menolak field yang tidak termasuk dalam daftar whitelist.
 * Mencegah mass assignment (misalnya client mencoba mengirim id, mahasiswaId, atau status).
 */
function findUnexpectedFields(body, allowedFields) {
  return Object.keys(body).filter((key) => !allowedFields.includes(key));
}

/**
 * Validasi parameter :id pada URL (harus bilangan bulat positif).
 */
function validateIdParam(req, _res, next) {
  const { id } = req.params;
  if (!id || !/^[1-9]\d*$/.test(String(id))) {
    return next(new AppError(400, 'Parameter ID pengaduan tidak valid. Harus berupa bilangan bulat positif.'));
  }

  req.parsedId = Number(id);
  return next();
}

/**
 * Validasi payload login: POST /api/auth/login
 */
function validateLogin(req, _res, next) {
  try {
    ensureJsonBodyObject(req);
    const allowedFields = ['username', 'password'];
    const unexpected = findUnexpectedFields(req.body, allowedFields);

    if (unexpected.length > 0) {
      throw new AppError(400, 'Request memuat field yang tidak diperbolehkan.', [
        `Field tidak diperbolehkan: ${unexpected.join(', ')}`
      ]);
    }

    const errors = [];
    const { username, password } = req.body;

    if (typeof username !== 'string' || username.trim().length === 0) {
      errors.push('Field username wajib diisi dan berupa string.');
    }

    if (typeof password !== 'string' || password.length === 0) {
      errors.push('Field password wajib diisi dan berupa string.');
    }

    if (errors.length > 0) {
      throw new AppError(400, 'Validasi kredensial login gagal.', errors);
    }

    req.validatedBody = {
      username: username.trim(),
      password
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Validasi payload pembuatan dan pembaruan konten pengaduan:
 * POST /api/pengaduan & PUT /api/pengaduan/:id
 * Field terlarang seperti id, mahasiswaId, status, createdAt otomatis ditolak (400).
 */
function validatePengaduanPayload(req, _res, next) {
  try {
    ensureJsonBodyObject(req);
    const allowedFields = ['judul', 'kategori', 'deskripsi'];
    const unexpected = findUnexpectedFields(req.body, allowedFields);

    if (unexpected.length > 0) {
      throw new AppError(400, 'Request memuat field yang tidak diperbolehkan.', [
        `Field tidak diperbolehkan: ${unexpected.join(', ')}. Hanya field judul, kategori, dan deskripsi yang diterima.`
      ]);
    }

    const errors = [];
    const { judul, kategori, deskripsi } = req.body;

    if (typeof judul !== 'string' || judul.trim().length === 0) {
      errors.push('Field judul wajib diisi.');
    } else if (judul.trim().length < 5 || judul.trim().length > 150) {
      errors.push('Field judul harus memiliki panjang antara 5 hingga 150 karakter.');
    }

    if (typeof kategori !== 'string' || kategori.trim().length === 0) {
      errors.push('Field kategori wajib diisi.');
    } else if (!ALLOWED_KATEGORI.includes(kategori.trim())) {
      errors.push(`Field kategori tidak valid. Nilai yang diperbolehkan: ${ALLOWED_KATEGORI.join(', ')}.`);
    }

    if (typeof deskripsi !== 'string' || deskripsi.trim().length === 0) {
      errors.push('Field deskripsi wajib diisi.');
    } else if (deskripsi.trim().length < 10 || deskripsi.trim().length > 2000) {
      errors.push('Field deskripsi harus memiliki panjang antara 10 hingga 2000 karakter.');
    }

    if (errors.length > 0) {
      throw new AppError(400, 'Validasi data pengaduan gagal.', errors);
    }

    req.validatedBody = {
      judul: judul.trim(),
      kategori: kategori.trim(),
      deskripsi: deskripsi.trim()
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Validasi payload pembaruan status pengaduan oleh Admin:
 * PATCH /api/pengaduan/:id/status
 * Hanya menerima field 'status'; menolak perubahan field lain termasuk 'mahasiswaId'.
 */
function validateUpdateStatus(req, _res, next) {
  try {
    ensureJsonBodyObject(req);
    const allowedFields = ['status'];
    const unexpected = findUnexpectedFields(req.body, allowedFields);

    if (unexpected.length > 0) {
      throw new AppError(400, 'Request memuat field yang tidak diperbolehkan.', [
        `Field tidak diperbolehkan: ${unexpected.join(', ')}. Endpoint ini hanya menerima field status.`
      ]);
    }

    const { status } = req.body;
    if (typeof status !== 'string' || !ALLOWED_STATUS.includes(status.trim())) {
      throw new AppError(400, 'Validasi status pengaduan gagal.', [
        `Field status wajib diisi dengan salah satu nilai: ${ALLOWED_STATUS.join(', ')}.`
      ]);
    }

    req.validatedBody = {
      status: status.trim()
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  ALLOWED_KATEGORI,
  ALLOWED_STATUS,
  validateIdParam,
  validateLogin,
  validatePengaduanPayload,
  validateUpdateStatus
};
