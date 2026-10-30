'use strict';

const bcrypt = require('bcryptjs');

// Usuarios de ejemplo. Las claves NO estan en el codigo: cada usuario toma la
// suya de una variable de entorno distinta (ver .env.example). Si compartieran
// clave, quien entra como operaciones de un comercio podria entrar como admin.
const USERS = [
  { email: 'admin@cuantico.test', role: 'admin', merchants: [], env: 'DEMO_ADMIN_PASSWORD' },
  {
    email: 'ops.la80@cuantico.test',
    role: 'operaciones',
    merchants: ['Tienda La 80'],
    env: 'DEMO_OPS_LA80_PASSWORD',
  },
  {
    email: 'ops.farmacia@cuantico.test',
    role: 'operaciones',
    merchants: ['Farmacia Central'],
    env: 'DEMO_OPS_FARMACIA_PASSWORD',
  },
  { email: 'ingesta@cuantico.test', role: 'ingesta', merchants: [], env: 'DEMO_INGEST_PASSWORD' },
];

function passwords() {
  const values = USERS.map((u) => process.env[u.env]);
  USERS.forEach((u, i) => {
    const value = values[i];
    if (!value || value.length < 12 || Buffer.byteLength(value) > 72) {
      throw new Error(`Define ${u.env} (entre 12 caracteres y 72 bytes). Ver .env.example.`);
    }
  });
  if (new Set(values).size !== values.length) {
    throw new Error('Cada usuario de ejemplo debe tener una clave distinta.');
  }
  return values;
}

module.exports = {
  async up(queryInterface) {
    const values = passwords();
    const now = new Date();

    const rows = await queryInterface.bulkInsert(
      'users',
      await Promise.all(
        USERS.map(async ({ email, role }, i) => ({
          email,
          password_hash: await bcrypt.hash(values[i], 10),
          role,
          created_at: now,
          updated_at: now,
        })),
      ),
      { returning: ['id', 'email'] },
    );
    const userId = new Map(rows.map((r) => [r.email, r.id]));

    const [merchants] = await queryInterface.sequelize.query('SELECT id, name FROM merchants');
    const merchantId = new Map(merchants.map((m) => [m.name, m.id]));

    const links = USERS.flatMap((u) =>
      u.merchants.map((name) => ({
        user_id: userId.get(u.email),
        merchant_id: merchantId.get(name),
      })),
    );
    if (links.length > 0) await queryInterface.bulkInsert('user_merchants', links);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('TRUNCATE user_merchants, users RESTART IDENTITY CASCADE');
  },
};
