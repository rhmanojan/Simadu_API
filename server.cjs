require('dotenv').config();
const app = require('./app.cjs');

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) {
  console.error('[FATAL] Environment variable JWT_SECRET wajib diisi minimal 16 karakter.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(` SIMADU API berjalan pada http://localhost:${PORT}`);
  console.log(` Swagger UI : http://localhost:${PORT}/api-docs`);
  console.log(` OpenAPI    : http://localhost:${PORT}/api-docs.json`);
  console.log(`========================================================`);
});
