process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'simadu_uts_wse_2026_super_secret_key_change_in_production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REQUIRE_API_KEY = 'false';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../app.cjs');
const pengaduanRepository = require('../src/repositories/pengaduan.repository.cjs');

let server;
let baseUrl;

async function request(method, path, { token, body, rawBody, headers = {} } = {}) {
  const reqHeaders = { ...headers };
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  let fetchBody;
  if (rawBody !== undefined) {
    reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
    fetchBody = rawBody;
  } else if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: reqHeaders,
    body: fetchBody
  });

  const json = await res.json();
  return { status: res.status, body: json };
}

async function loginAs(username, password) {
  const res = await request('POST', '/api/auth/login', {
    body: { username, password }
  });
  return res;
}

describe('SIMADU API — Pengujian Fungsional & Keamanan (UTS WSE)', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    pengaduanRepository.reset();
  });

  it('Skenario 1: Login dengan kredensial benar mengembalikan 200 dan Bearer Token unik', async () => {
    const res1 = await loginAs('mhs01', 'Mhs12345!');
    const res2 = await loginAs('mhs02', 'Mhs67890!');

    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.equal(typeof res1.body.data.token, 'string');
    assert.equal(res1.body.data.tokenType, 'Bearer');
    assert.equal(res1.body.data.user.role, 'mahasiswa');
    assert.equal(res1.body.data.user.passwordHash, undefined);
    // Pastikan token unik per pengguna / sesi
    assert.notEqual(res1.body.data.token, res2.body.data.token);
  });

  it('Skenario 2: Login dengan password salah mengembalikan 401', async () => {
    const res = await loginAs('mhs01', 'PasswordSalah123');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('Skenario 3: Akses endpoint terlindungi tanpa token mengembalikan 401', async () => {
    const res = await request('GET', '/api/pengaduan');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('Skenario 4: Akses menggunakan token tidak valid mengembalikan 401', async () => {
    const res = await request('GET', '/api/pengaduan', {
      token: 'token.palsu.tidakvalid'
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('Skenario 5: Mahasiswa membuat pengaduan valid mengembalikan 201 dengan mahasiswaId otomatis dari token', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const res = await request('POST', '/api/pengaduan', {
      token: auth.data.token,
      body: {
        judul: 'AC Ruang Kuliah R-301 Tidak Dingin',
        kategori: 'Fasilitas',
        deskripsi: 'AC di ruang R-301 mati sejak kemarin siang sehingga perkuliahan terganggu.'
      }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, 4);
    assert.equal(res.body.data.mahasiswaId, '240101001');
    assert.equal(res.body.data.status, 'diajukan');
    assert.ok(!Number.isNaN(Date.parse(res.body.data.createdAt)));
  });

  it('Skenario 6: Mahasiswa membaca pengaduan sendiri mengembalikan 200 (daftar & detail)', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');

    const listRes = await request('GET', '/api/pengaduan', { token: auth.data.token });
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 2);
    assert.ok(listRes.body.data.every((item) => item.mahasiswaId === '240101001'));

    const detailRes = await request('GET', '/api/pengaduan/1', { token: auth.data.token });
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.data.id, 1);
    assert.equal(detailRes.body.data.mahasiswaId, '240101001');
  });

  it('Skenario 7: Mahasiswa mencoba membaca pengaduan orang lain mengembalikan 403', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    // ID 3 adalah milik mahasiswa 240101002 (mhs02)
    const res = await request('GET', '/api/pengaduan/3', { token: auth.data.token });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('Skenario 8: Mahasiswa mengubah status pengaduan mengembalikan 403', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const res = await request('PATCH', '/api/pengaduan/1/status', {
      token: auth.data.token,
      body: { status: 'selesai' }
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('Skenario 9: Admin melihat seluruh pengaduan mengembalikan 200', async () => {
    const { body: auth } = await loginAs('admin01', 'Admin12345!');
    const res = await request('GET', '/api/pengaduan', { token: auth.data.token });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 3);
  });

  it('Skenario 10: Admin memperbarui status pengaduan mengembalikan 200 tanpa mengubah mahasiswaId', async () => {
    const { body: auth } = await loginAs('admin01', 'Admin12345!');
    const res = await request('PATCH', '/api/pengaduan/1/status', {
      token: auth.data.token,
      body: { status: 'diproses' }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.id, 1);
    assert.equal(res.body.data.status, 'diproses');
    assert.equal(res.body.data.mahasiswaId, '240101001');
  });

  it('Skenario 11: Membuat pengaduan dengan field wajib kosong mengembalikan 400 dan tidak menambah data', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const beforeCount = pengaduanRepository.findAll().length;

    const res = await request('POST', '/api/pengaduan', {
      token: auth.data.token,
      body: {
        judul: '',
        kategori: 'Fasilitas',
        deskripsi: ''
      }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(Array.isArray(res.body.errors) && res.body.errors.length >= 2);
    assert.equal(pengaduanRepository.findAll().length, beforeCount);
  });

  it('Skenario 12: Mengakses ID pengaduan yang tidak ditemukan mengembalikan 404', async () => {
    const { body: auth } = await loginAs('admin01', 'Admin12345!');
    const res = await request('GET', '/api/pengaduan/999', { token: auth.data.token });
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  // --- Pengujian Keamanan & Kebijakan Tambahan ---

  it('Tambahan 13: Mahasiswa mengubah pengaduan sendiri berstatus diajukan mengembalikan 200', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const res = await request('PUT', '/api/pengaduan/1', {
      token: auth.data.token,
      body: {
        judul: 'Proyektor Lab TI-2 Mati Total (Revisi)',
        kategori: 'Fasilitas',
        deskripsi: 'Proyektor di ruang Lab TI-2 tidak menyala sama sekali sejak Senin pagi.'
      }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.judul, 'Proyektor Lab TI-2 Mati Total (Revisi)');
    assert.equal(res.body.data.mahasiswaId, '240101001');
  });

  it('Tambahan 14: Mahasiswa mengubah pengaduan sendiri yang sudah berstatus diproses ditolak 403', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const beforeRecord = pengaduanRepository.findById(2);

    const res = await request('PUT', '/api/pengaduan/2', {
      token: auth.data.token,
      body: {
        judul: 'Coba Ubah Pengaduan Sedang Diproses',
        kategori: 'TI',
        deskripsi: 'Seharusnya ditolak karena status sudah diproses oleh admin.'
      }
    });

    assert.equal(res.status, 403);
    assert.deepEqual(pengaduanRepository.findById(2), beforeRecord);
  });

  it('Tambahan 15: Mahasiswa menghapus pengaduan sendiri berstatus diajukan mengembalikan 200', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const res = await request('DELETE', '/api/pengaduan/1', { token: auth.data.token });

    assert.equal(res.status, 200);
    assert.equal(pengaduanRepository.findById(1), null);
  });

  it('Tambahan 16: Menolak field terlarang (id, mahasiswaId, status) dengan 400 dan data tetap utuh', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const beforeCount = pengaduanRepository.findAll().length;

    const res = await request('POST', '/api/pengaduan', {
      token: auth.data.token,
      body: {
        id: 99,
        mahasiswaId: '240101002',
        status: 'selesai',
        judul: 'Percobaan Mass Assignment',
        kategori: 'TI',
        deskripsi: 'Mencoba memalsukan mahasiswaId dan status secara langsung dari client.'
      }
    });

    assert.equal(res.status, 400);
    assert.equal(pengaduanRepository.findAll().length, beforeCount);
  });

  it('Tambahan 17: Admin mencoba membuat atau menghapus pengaduan ditolak 403 sesuai matriks', async () => {
    const { body: auth } = await loginAs('admin01', 'Admin12345!');

    const createRes = await request('POST', '/api/pengaduan', {
      token: auth.data.token,
      body: {
        judul: 'Admin Tidak Boleh Buat Pengaduan',
        kategori: 'Akademik',
        deskripsi: 'Sesuai matriks hak akses, hanya mahasiswa yang dapat membuat pengaduan.'
      }
    });
    assert.equal(createRes.status, 403);

    const deleteRes = await request('DELETE', '/api/pengaduan/1', { token: auth.data.token });
    assert.equal(deleteRes.status, 403);
  });

  it('Tambahan 18: Token kedaluwarsa (expired) ditolak dengan 401', async () => {
    const expiredToken = jwt.sign(
      { sub: 'USR-MHS-01', username: 'mhs01', role: 'mahasiswa', mahasiswaId: '240101001' },
      process.env.JWT_SECRET,
      { expiresIn: -10, algorithm: 'HS256' }
    );

    const res = await request('GET', '/api/pengaduan', { token: expiredToken });
    assert.equal(res.status, 401);
    assert.match(res.body.message, /kedaluwarsa/i);
  });

  it('Tambahan 19: Request body JSON tidak valid (malformed JSON) ditolak 400 tanpa stack trace', async () => {
    const { body: auth } = await loginAs('mhs01', 'Mhs12345!');
    const res = await request('POST', '/api/pengaduan', {
      token: auth.data.token,
      rawBody: '{"judul": "JSON Rusak", '
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.stack, undefined);
  });

  it('Tambahan 20: Admin tidak dapat menyisipkan mahasiswaId saat PATCH status (ditolak 400)', async () => {
    const { body: auth } = await loginAs('admin01', 'Admin12345!');
    const beforeRecord = pengaduanRepository.findById(1);

    const res = await request('PATCH', '/api/pengaduan/1/status', {
      token: auth.data.token,
      body: { status: 'diproses', mahasiswaId: '999999999' }
    });

    assert.equal(res.status, 400);
    assert.deepEqual(pengaduanRepository.findById(1), beforeRecord);
  });
});
