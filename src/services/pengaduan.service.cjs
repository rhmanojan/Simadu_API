const pengaduanRepository = require('../repositories/pengaduan.repository.cjs');
const { AppError } = require('../middleware/error.middleware.cjs');

/**
 * Mengambil daftar pengaduan sesuai hak akses:
 * - Admin: seluruh pengaduan
 * - Mahasiswa: hanya pengaduan miliknya sendiri
 */
function getAllPengaduan(user) {
  if (user.role === 'admin') {
    return pengaduanRepository.findAll();
  }

  if (user.role === 'mahasiswa') {
    return pengaduanRepository.findByMahasiswaId(user.mahasiswaId);
  }

  throw new AppError(403, 'Peran pengguna tidak memiliki izin membaca pengaduan.');
}

/**
 * Mengambil detail pengaduan berdasarkan ID dengan pemeriksaan kepemilikan.
 * - Admin dapat melihat pengaduan siapa saja.
 * - Mahasiswa hanya dapat melihat pengaduan miliknya sendiri (403 jika milik orang lain).
 */
function getPengaduanById(id, user) {
  const pengaduan = pengaduanRepository.findById(id);
  if (!pengaduan) {
    throw new AppError(404, `Pengaduan dengan ID ${id} tidak ditemukan.`);
  }

  if (user.role === 'mahasiswa' && pengaduan.mahasiswaId !== user.mahasiswaId) {
    throw new AppError(403, 'Akses ditolak. Anda tidak memiliki izin melihat pengaduan milik mahasiswa lain.');
  }

  return pengaduan;
}

/**
 * Membuat pengaduan baru (hanya Mahasiswa).
 * ID, mahasiswaId (dari token autentikasi), status ('diajukan'), dan createdAt ditentukan penuh oleh server.
 */
function createPengaduan({ judul, kategori, deskripsi }, user) {
  if (user.role !== 'mahasiswa' || !user.mahasiswaId) {
    throw new AppError(403, 'Hanya mahasiswa yang diperbolehkan membuat pengaduan.');
  }

  return pengaduanRepository.create({
    mahasiswaId: user.mahasiswaId,
    judul,
    kategori,
    deskripsi
  });
}

/**
 * Mengubah judul, kategori, dan deskripsi pengaduan (hanya Mahasiswa pemilik, selama status 'diajukan').
 */
function updatePengaduan(id, { judul, kategori, deskripsi }, user) {
  if (user.role !== 'mahasiswa') {
    throw new AppError(403, 'Hanya mahasiswa pemilik yang diperbolehkan mengubah isi pengaduan.');
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(404, `Pengaduan dengan ID ${id} tidak ditemukan.`);
  }

  if (existing.mahasiswaId !== user.mahasiswaId) {
    throw new AppError(403, 'Akses ditolak. Anda hanya diperbolehkan mengubah pengaduan milik sendiri.');
  }

  if (existing.status !== 'diajukan') {
    throw new AppError(
      403,
      `Pengaduan tidak dapat diubah karena status saat ini adalah '${existing.status}'. Perubahan hanya diizinkan selama berstatus 'diajukan'.`
    );
  }

  return pengaduanRepository.update(id, { judul, kategori, deskripsi });
}

/**
 * Memperbarui status penanganan pengaduan (hanya Admin).
 * Tidak dapat mengubah identitas pemilik (mahasiswaId) maupun konten pengaduan.
 */
function updatePengaduanStatus(id, { status }, user) {
  if (user.role !== 'admin') {
    throw new AppError(403, 'Hanya administrator yang diperbolehkan mengubah status pengaduan.');
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(404, `Pengaduan dengan ID ${id} tidak ditemukan.`);
  }

  return pengaduanRepository.updateStatus(id, status);
}

/**
 * Menghapus pengaduan (hanya Mahasiswa pemilik, selama status 'diajukan').
 */
function deletePengaduan(id, user) {
  if (user.role !== 'mahasiswa') {
    throw new AppError(403, 'Hanya mahasiswa pemilik yang diperbolehkan menghapus pengaduan.');
  }

  const existing = pengaduanRepository.findById(id);
  if (!existing) {
    throw new AppError(404, `Pengaduan dengan ID ${id} tidak ditemukan.`);
  }

  if (existing.mahasiswaId !== user.mahasiswaId) {
    throw new AppError(403, 'Akses ditolak. Anda hanya diperbolehkan menghapus pengaduan milik sendiri.');
  }

  if (existing.status !== 'diajukan') {
    throw new AppError(
      403,
      `Pengaduan tidak dapat dihapus karena status saat ini adalah '${existing.status}'. Penghapusan hanya diizinkan selama berstatus 'diajukan'.`
    );
  }

  return pengaduanRepository.deleteById(id);
}

module.exports = {
  getAllPengaduan,
  getPengaduanById,
  createPengaduan,
  updatePengaduan,
  updatePengaduanStatus,
  deletePengaduan
};
