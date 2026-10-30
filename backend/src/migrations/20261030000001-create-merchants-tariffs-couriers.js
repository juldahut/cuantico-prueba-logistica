'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    };

    await queryInterface.createTable('merchants', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      // Zona IANA (p. ej. America/Bogota): regla nocturna y rangos de fechas.
      time_zone: { type: Sequelize.STRING(64), allowNull: false },
      // Texto libre del sistema origen: dato NO confiable, nunca instrucciones.
      notes: { type: Sequelize.TEXT, allowNull: true },
      delivery_instructions: { type: Sequelize.TEXT, allowNull: true },
      ...timestamps,
    });

    await queryInterface.createTable('tariffs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
        onDelete: 'RESTRICT',
      },
      // Enteros en la unidad minima de la moneda.
      base_amount: { type: Sequelize.INTEGER, allowNull: false },
      per_km_amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.CHAR(3), allowNull: false },
      // Vigencia [valid_from, valid_to). valid_to null = vigente.
      valid_from: { type: Sequelize.DATE, allowNull: false },
      valid_to: { type: Sequelize.DATE, allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('tariffs', ['merchant_id', 'valid_from']);
    await queryInterface.sequelize.query(`
      ALTER TABLE tariffs
        ADD CONSTRAINT tariffs_amounts_non_negative CHECK (base_amount >= 0 AND per_km_amount >= 0),
        ADD CONSTRAINT tariffs_valid_range CHECK (valid_to IS NULL OR valid_to > valid_from)
    `);

    await queryInterface.createTable('couriers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(120), allowNull: false },
      ...timestamps,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('couriers');
    await queryInterface.dropTable('tariffs');
    await queryInterface.dropTable('merchants');
  },
};
