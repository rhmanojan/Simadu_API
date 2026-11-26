const pengaduanService = require('../services/pengaduan.service.cjs');

function getAll(req, res) {
  const items = pengaduanService.getAllPengaduan(req.user);

  return res.status(200).json({
    success: true,
    message: 'Daftar pengaduan berhasil diambil.',
    total: items.length,
    data: items
  });
}

function getById(req, res) {
  const item = pengaduanService.getPengaduanById(req.parsedId, req.user);

  return res.status(200).json({
    success: true,
    message: 'Detail pengaduan berhasil diambil.',
    data: item
  });
}

function create(req, res) {
  const created = pengaduanService.createPengaduan(req.validatedBody, req.user);

  return res.status(201).json({
    success: true,
    message: 'Pengaduan berhasil dibuat.',
    data: created
  });
}

function update(req, res) {
  const updated = pengaduanService.updatePengaduan(req.parsedId, req.validatedBody, req.user);

  return res.status(200).json({
    success: true,
    message: 'Pengaduan berhasil diperbarui.',
    data: updated
  });
}

function updateStatus(req, res) {
  const updated = pengaduanService.updatePengaduanStatus(req.parsedId, req.validatedBody, req.user);

  return res.status(200).json({
    success: true,
    message: 'Status pengaduan berhasil diperbarui.',
    data: updated
  });
}

function remove(req, res) {
  const deleted = pengaduanService.deletePengaduan(req.parsedId, req.user);

  return res.status(200).json({
    success: true,
    message: 'Pengaduan berhasil dihapus.',
    data: deleted
  });
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  remove
};
