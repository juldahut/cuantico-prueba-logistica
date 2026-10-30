'use strict';

const bcrypt = require('bcryptjs');

// Usuarios de ejemplo. La clave NO esta en el codigo: sale de la variable de
// entorno DEMO_USERS_PASSWORD (ver .env.example) y es la misma para todos.
const USERS = [
  { email: 'admin@cuantico.test', role: 'admin', merchants: [] },
  { email: 'ops.la80@cuantico.test', role: 'operaciones', merchants: ['Tienda La 80'] },
  { email: 'ops.farmacia@cuantico.test', role: 'operaciones', merchants: ['Farmacia Central'] },
  { email: 'ingesta@cuantico.test', role: 'ingesta', merchants: [] },
];

module.exports = {
  async up(queryInterface) {
    const password = process.env.DEMO_USERS_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error(
        'Define DEMO_USERS_PASSWORD (minimo 12 caracteres) para crear los usuarios de ejemplo.',
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const rows = await queryInterface.bulkInsert(
      'users',
      USERS.map(({ email, role }) => ({
        email,
        password_hash: passwordHash,
        role,
        created_at: now,
        updated_at: now,
      })),
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
