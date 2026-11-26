/**
 * Repository data pengaduan berbasis penyimpanan dalam memori (in-memory store).
 * Mengembalikan salinan objek (clone) untuk mencegah mutasi tidak sengaja di luar repository.
 */
const INITIAL_PENGADUAN = Object.freeze([
  {
    id: 1,
    mahasiswaId: '240101001',
    judul: 'Proyektor Ruang Lab TI-2 Rusak',
    kategori: 'Fasilitas',
    deskripsi: 'Proyektor di ruang laboratorium TI-2 tidak menampilkan gambar sejak hari Senin pagi.',
    status: 'diajukan',
    createdAt: '2026-11-18T08:30:00.000Z'
  },
  {
    id: 2,
    mahasiswaId: '240101001',
    judul: 'Gangguan Akses Wi-Fi Gedung Fakultas',
    kategori: 'TI',
    deskripsi: 'Koneksi Wi-Fi kampus di lantai 2 sering terputus saat jam perkuliahan berlangsung.',
    status: 'diproses',
    createdAt: '2026-11-18T10:15:00.000Z'
  },
  {
    id: 3,
    mahasiswaId: '240101002',
    judul: 'Keterlambatan Validasi KRS Semester Ganjil',
    kategori: 'Akademik',
    deskripsi: 'Pengajuan perubahan KRS di portal akademik belum tervalidasi selama tiga hari kerja.',
    status: 'diajukan',
    createdAt: '2026-11-19T01:45:00.000Z'
  }
]);

let pengaduanStore = INITIAL_PENGADUAN.map((item) => ({ ...item }));
let nextId = pengaduanStore.length + 1;

function clone(item) {
  return item ? { ...item } : null;
}

function findAll() {
  return pengaduanStore.map(clone);
}

function findByMahasiswaId(mahasiswaId) {
  return pengaduanStore.filter((item) => item.mahasiswaId === mahasiswaId).map(clone);
}

function findById(id) {
  const found = pengaduanStore.find((item) => item.id === id);
  return clone(found);
}

function create({ mahasiswaId, judul, kategori, deskripsi }) {
  const record = {
    id: nextId++,
    mahasiswaId,
    judul,
    kategori,
    deskripsi,
    status: 'diajukan',
    createdAt: new Date().toISOString()
  };

  pengaduanStore.push(record);
  return clone(record);
}

function update(id, { judul, kategori, deskripsi }) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  pengaduanStore[index] = {
    ...pengaduanStore[index],
    judul,
    kategori,
    deskripsi
  };

  return clone(pengaduanStore[index]);
}

function updateStatus(id, status) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  pengaduanStore[index] = {
    ...pengaduanStore[index],
    status
  };

  return clone(pengaduanStore[index]);
}

function deleteById(id) {
  const index = pengaduanStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  const [deleted] = pengaduanStore.splice(index, 1);
  return clone(deleted);
}

/**
 * Mengatur ulang data ke kondisi awal (digunakan pada pengujian otomatis).
 */
function reset() {
  pengaduanStore = INITIAL_PENGADUAN.map((item) => ({ ...item }));
  nextId = pengaduanStore.length + 1;
}

module.exports = {
  findAll,
  findByMahasiswaId,
  findById,
  create,
  update,
  updateStatus,
  deleteById,
  reset
};
