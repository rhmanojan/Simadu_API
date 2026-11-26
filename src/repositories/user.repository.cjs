/**
 * Repository data pengguna SIMADU API.
 * Seluruh password disimpan dalam bentuk hash bcrypt (salt rounds = 10), bukan plaintext.
 * Data uji awal mencakup 2 mahasiswa dan 1 administrator sesuai ketentuan UTS.
 */
const USERS = Object.freeze([
  {
    id: 'USR-MHS-01',
    username: 'mhs01',
    nama: 'Ahmad Fauzi',
    role: 'mahasiswa',
    mahasiswaId: '240101001',
    passwordHash: '$2b$10$SZE4Cgw4UZu7/K9hWiquEOgZzP5UbcEMr5otOkqmyCOMGcEXoQb0O'
  },
  {
    id: 'USR-MHS-02',
    username: 'mhs02',
    nama: 'Siti Rahma',
    role: 'mahasiswa',
    mahasiswaId: '240101002',
    passwordHash: '$2b$10$DcIkmfBOc7HFus.l2xsn7OwM.3OATVs3iLAtmLLk8Mk9j4GJpR6Jy'
  },
  {
    id: 'USR-ADM-01',
    username: 'admin01',
    nama: 'Budi Santoso',
    role: 'admin',
    mahasiswaId: null,
    passwordHash: '$2b$10$hi4AkKMcMGuVo3SYTgoBDOvd6ecSgY5uwHWIqM/LSIca6GlmtN7r6'
  }
]);

function clone(user) {
  return user ? { ...user } : null;
}

function findByUsername(username) {
  const user = USERS.find((item) => item.username === username);
  return clone(user);
}

function findById(id) {
  const user = USERS.find((item) => item.id === id);
  return clone(user);
}

module.exports = {
  findByUsername,
  findById
};
