/**
 * Script eksekusi 12 skenario pengujian wajib + 6 skenario keamanan tambahan
 * terhadap server SIMADU API yang berjalan nyata, lalu menyimpan bukti respons
 * aktual ke tests/test-results.json untuk keperluan laporan UTS.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'simadu_uts_wse_2026_super_secret_key_change_in_production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REQUIRE_API_KEY = 'false';

const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const app = require('../app.cjs');
const pengaduanRepository = require('../src/repositories/pengaduan.repository.cjs');

function maskToken(token) {
  if (!token || typeof token !== 'string') return token;
  if (token.length <= 36) return token;
  return `${token.slice(0, 24)}...${token.slice(-12)}`;
}

function sanitizeResponseForLog(body) {
  const cloned = JSON.parse(JSON.stringify(body));
  if (cloned?.data?.token) {
    cloned.data.token = maskToken(cloned.data.token);
  }
  return cloned;
}

async function run() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const results = [];

  async function execScenario({ no, category, title, method, endpoint, token, body, expectedStatus, note }) {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const responseBody = await res.json();
    const passed = res.status === expectedStatus;

    results.push({
      no,
      category,
      title,
      method,
      endpoint,
      authHeader: token ? `Bearer ${maskToken(token)}` : '(Tanpa Authorization Header)',
      requestBody: body ?? null,
      expectedStatus,
      actualStatus: res.status,
      passed,
      note: note || '',
      responseBody: sanitizeResponseForLog(responseBody)
    });

    return { status: res.status, rawBody: responseBody };
  }

  try {
    pengaduanRepository.reset();

    // Skenario 1: Login kredensial benar
    const s1 = await execScenario({
      no: 1,
      category: 'Wajib',
      title: 'Login dengan kredensial benar',
      method: 'POST',
      endpoint: '/api/auth/login',
      body: { username: 'mhs01', password: 'Mhs12345!' },
      expectedStatus: 200,
      note: 'Token JWT diterima (masked pada laporan demi keamanan)'
    });
    const mhs1Token = s1.rawBody.data.token;

    // Login Admin untuk skenario 9, 10, 12
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin01', password: 'Admin12345!' })
    });
    const adminToken = (await adminLoginRes.json()).data.token;

    // Skenario 2: Login password salah
    await execScenario({
      no: 2,
      category: 'Wajib',
      title: 'Login dengan password salah',
      method: 'POST',
      endpoint: '/api/auth/login',
      body: { username: 'mhs01', password: 'SalahPassword!' },
      expectedStatus: 401,
      note: 'Sistem menolak kredensial tidak cocok tanpa membocorkan detail akun'
    });

    // Skenario 3: Akses endpoint terlindungi tanpa token
    await execScenario({
      no: 3,
      category: 'Wajib',
      title: 'Akses endpoint terlindungi tanpa token',
      method: 'GET',
      endpoint: '/api/pengaduan',
      expectedStatus: 401,
      note: 'Middleware authenticate menolak akses anonim'
    });

    // Skenario 4: Akses menggunakan token tidak valid
    await execScenario({
      no: 4,
      category: 'Wajib',
      title: 'Akses menggunakan token tidak valid',
      method: 'GET',
      endpoint: '/api/pengaduan',
      token: 'eyJhbGciOiJIUzI1NiJ9.payloadpalsu.tandaTanganSalah',
      expectedStatus: 401,
      note: 'Verifikasi tanda tangan JWT gagal dan ditolak'
    });

    // Skenario 5: Mahasiswa membuat pengaduan valid
    await execScenario({
      no: 5,
      category: 'Wajib',
      title: 'Mahasiswa membuat pengaduan valid',
      method: 'POST',
      endpoint: '/api/pengaduan',
      token: mhs1Token,
      body: {
        judul: 'AC Ruang Kuliah R-301 Tidak Dingin',
        kategori: 'Fasilitas',
        deskripsi: 'AC di ruang kuliah R-301 mati sejak kemarin siang sehingga perkuliahan tidak nyaman.'
      },
      expectedStatus: 201,
      note: 'ID (4), mahasiswaId (240101001), status (diajukan), dan createdAt diisi otomatis oleh server'
    });

    // Skenario 6: Mahasiswa membaca pengaduan sendiri
    await execScenario({
      no: 6,
      category: 'Wajib',
      title: 'Mahasiswa membaca pengaduan sendiri',
      method: 'GET',
      endpoint: '/api/pengaduan/1',
      token: mhs1Token,
      expectedStatus: 200,
      note: 'Mahasiswa 240101001 diizinkan membaca detail pengaduan ID 1 miliknya'
    });

    // Skenario 7: Mahasiswa mencoba membaca pengaduan orang lain
    await execScenario({
      no: 7,
      category: 'Wajib',
      title: 'Mahasiswa mencoba membaca pengaduan orang lain',
      method: 'GET',
      endpoint: '/api/pengaduan/3',
      token: mhs1Token,
      expectedStatus: 403,
      note: 'Pengaduan ID 3 milik 240101002 sehingga ditolak 403 Forbidden'
    });

    // Skenario 8: Mahasiswa mengubah status pengaduan
    await execScenario({
      no: 8,
      category: 'Wajib',
      title: 'Mahasiswa mengubah status pengaduan',
      method: 'PATCH',
      endpoint: '/api/pengaduan/1/status',
      token: mhs1Token,
      body: { status: 'selesai' },
      expectedStatus: 403,
      note: 'Middleware RBAC authorizeRoles("admin") menolak peran mahasiswa'
    });

    // Skenario 9: Admin melihat seluruh pengaduan
    await execScenario({
      no: 9,
      category: 'Wajib',
      title: 'Admin melihat seluruh pengaduan',
      method: 'GET',
      endpoint: '/api/pengaduan',
      token: adminToken,
      expectedStatus: 200,
      note: 'Admin melihat seluruh 4 pengaduan lintas mahasiswa (240101001 dan 240101002)'
    });

    // Skenario 10: Admin memperbarui status pengaduan
    await execScenario({
      no: 10,
      category: 'Wajib',
      title: 'Admin memperbarui status pengaduan',
      method: 'PATCH',
      endpoint: '/api/pengaduan/1/status',
      token: adminToken,
      body: { status: 'diproses' },
      expectedStatus: 200,
      note: 'Status ID 1 diperbarui ke diproses; mahasiswaId tetap 240101001'
    });

    // Skenario 11: Membuat pengaduan dengan field wajib kosong
    await execScenario({
      no: 11,
      category: 'Wajib',
      title: 'Membuat pengaduan dengan field wajib kosong',
      method: 'POST',
      endpoint: '/api/pengaduan',
      token: mhs1Token,
      body: { judul: '', kategori: 'Fasilitas', deskripsi: '' },
      expectedStatus: 400,
      note: 'Middleware validasi menolak input kosong sebelum menyentuh service/repository'
    });

    // Skenario 12: Mengakses ID pengaduan yang tidak ditemukan
    await execScenario({
      no: 12,
      category: 'Wajib',
      title: 'Mengakses ID pengaduan yang tidak ditemukan',
      method: 'GET',
      endpoint: '/api/pengaduan/999',
      token: adminToken,
      expectedStatus: 404,
      note: 'Pengaduan ID 999 tidak ada sehingga mengembalikan 404 Not Found'
    });

    // Skenario Tambahan 13: Mahasiswa mengubah pengaduan sendiri (status diajukan -> ID 4)
    await execScenario({
      no: 13,
      category: 'Tambahan',
      title: 'Mahasiswa mengubah pengaduan sendiri (status diajukan)',
      method: 'PUT',
      endpoint: '/api/pengaduan/4',
      token: mhs1Token,
      body: {
        judul: 'AC Ruang Kuliah R-301 Mati Total',
        kategori: 'Fasilitas',
        deskripsi: 'Pembaruan laporan: teknisi belum datang dan kedua unit AC di R-301 mati.'
      },
      expectedStatus: 200,
      note: 'Diperbolehkan karena milik mhs01 dan status masih diajukan'
    });

    // Skenario Tambahan 14: Mahasiswa mencoba mengubah pengaduan sendiri yang sudah diproses (ID 1)
    await execScenario({
      no: 14,
      category: 'Tambahan',
      title: 'Mahasiswa mengubah pengaduan sendiri berstatus diproses',
      method: 'PUT',
      endpoint: '/api/pengaduan/1',
      token: mhs1Token,
      body: {
        judul: 'Coba Ubah Pengaduan Diproses',
        kategori: 'Fasilitas',
        deskripsi: 'Percobaan mengubah pengaduan yang sudah berstatus diproses oleh admin.'
      },
      expectedStatus: 403,
      note: 'Ditolak karena kebijakan status hanya memperbolehkan edit saat status diajukan'
    });

    // Skenario Tambahan 15: Mahasiswa mencoba menyisipkan field terlarang (mahasiswaId & status)
    await execScenario({
      no: 15,
      category: 'Tambahan',
      title: 'Menolak field terlarang (mahasiswaId/status) pada POST',
      method: 'POST',
      endpoint: '/api/pengaduan',
      token: mhs1Token,
      body: {
        mahasiswaId: '240101002',
        status: 'selesai',
        judul: 'Percobaan Manipulasi Identitas',
        kategori: 'TI',
        deskripsi: 'Mencoba memalsukan identitas pemilik dan status dari sisi client.'
      },
      expectedStatus: 400,
      note: 'Validasi whitelist menolak mass assignment; jumlah data di repository tetap 4'
    });

    // Skenario Tambahan 16: Admin mencoba membuat pengaduan (ditolak matriks)
    await execScenario({
      no: 16,
      category: 'Tambahan',
      title: 'Admin mencoba membuat pengaduan baru',
      method: 'POST',
      endpoint: '/api/pengaduan',
      token: adminToken,
      body: {
        judul: 'Pengaduan oleh Admin',
        kategori: 'Akademik',
        deskripsi: 'Seharusnya ditolak karena sesuai matriks hanya mahasiswa yang boleh membuat.'
      },
      expectedStatus: 403,
      note: 'Sesuai matriks hak akses, Admin tidak memiliki izin membuat pengaduan'
    });

    // Skenario Tambahan 17: Mahasiswa menghapus pengaduan sendiri (status diajukan -> ID 4)
    await execScenario({
      no: 17,
      category: 'Tambahan',
      title: 'Mahasiswa menghapus pengaduan sendiri (status diajukan)',
      method: 'DELETE',
      endpoint: '/api/pengaduan/4',
      token: mhs1Token,
      expectedStatus: 200,
      note: 'Pengaduan ID 4 berhasil dihapus oleh pemiliknya saat masih berstatus diajukan'
    });

    // Skenario Tambahan 18: Akses menggunakan token yang sudah kedaluwarsa
    const expiredToken = jwt.sign(
      { sub: 'USR-MHS-01', username: 'mhs01', role: 'mahasiswa', mahasiswaId: '240101001' },
      process.env.JWT_SECRET,
      { expiresIn: -60, algorithm: 'HS256' }
    );
    await execScenario({
      no: 18,
      category: 'Tambahan',
      title: 'Akses endpoint menggunakan token kedaluwarsa (expired)',
      method: 'GET',
      endpoint: '/api/pengaduan',
      token: expiredToken,
      expectedStatus: 401,
      note: 'jwt.verify mendeteksi TokenExpiredError dan menolak dengan 401'
    });

    const passedCount = results.filter((r) => r.passed).length;
    const output = {
      executedAt: new Date().toISOString(),
      totalScenarios: results.length,
      passedScenarios: passedCount,
      failedScenarios: results.length - passedCount,
      scenarios: results
    };

    const outPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n=== HASIL EKSEKUSI SKENARIO SIMADU API ===`);
    for (const r of results) {
      const badge = r.passed ? 'PASS' : 'FAIL';
      console.log(
        `[${badge}] #${String(r.no).padStart(2, '0')} (${r.category.padEnd(8)}) ${r.method.padEnd(6)} ${r.endpoint.padEnd(26)} -> Expected ${r.expectedStatus}, Actual ${r.actualStatus} | ${r.title}`
      );
    }
    console.log(`\nRingkasan: ${passedCount}/${results.length} skenario LULUS.`);
    console.log(`Bukti lengkap tersimpan di: ${outPath}\n`);

    if (passedCount !== results.length) {
      process.exitCode = 1;
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run();
