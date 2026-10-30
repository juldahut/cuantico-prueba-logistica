'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') };

    // Proyeccion de lectura: se recalcula desde los eventos, nunca a la inversa.
    await queryInterface.createTable('deliveries', {
      id: { type: Sequelize.STRING(128), primaryKey: true },
      merchant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'merchants', key: 'id' },
      },
      courier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'couriers', key: 'id' },
      },
      address: { type: Sequelize.STRING(200), allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false },
      // Instante del evento terminal (entregada o fallida), en UTC.
      completed_at: { type: Sequelize.DATE, allowNull: true },
      cost_status: { type: Sequelize.STRING(20), allowNull: true },
      cost_amount: { type: Sequelize.INTEGER, allowNull: true },
      currency: { type: Sequelize.CHAR(3), allowNull: true },
      created_at: now,
      updated_at: now,
    });
    await queryInterface.addIndex('deliveries', ['merchant_id', 'completed_at']);
    await queryInterface.addIndex('deliveries', ['courier_id', 'status']);

    await queryInterface.createTable('delivery_events', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      // Idempotencia: decide la restriccion unica, no una consulta previa.
      event_id: { type: Sequelize.STRING(128), allowNull: false, unique: true },
      delivery_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        references: { model: 'deliveries', key: 'id' },
      },
      merchant_id: { type: Sequelize.INTEGER, allowNull: false },
      type: { type: Sequelize.STRING(20), allowNull: false },
      occurred_at: { type: Sequelize.DATE, allowNull: false },
      payload: { type: Sequelize.JSONB, allowNull: false },
      payload_hash: { type: Sequelize.CHAR(64), allowNull: false },
      received_at: now,
    });
    await queryInterface.addIndex('delivery_events', ['delivery_id']);

    // Append-only: cada calculo distinto es una fila nueva (auditoria, ADR 0001).
    await queryInterface.createTable('cost_calculations', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      delivery_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        references: { model: 'deliveries', key: 'id' },
      },
      status: { type: Sequelize.STRING(20), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: true },
      currency: { type: Sequelize.CHAR(3), allowNull: false },
      rules_version: { type: Sequelize.STRING(16), allowNull: false },
      breakdown: { type: Sequelize.JSONB, allowNull: true },
      distance_meters: { type: Sequelize.INTEGER, allowNull: true },
      is_night: { type: Sequelize.BOOLEAN, allowNull: true },
      reason: { type: Sequelize.STRING(32), allowNull: true },
      event_ids: { type: Sequelize.JSONB, allowNull: false },
      tariff_id: { type: Sequelize.INTEGER, allowNull: false },
      tariff_snapshot: { type: Sequelize.JSONB, allowNull: false },
      time_zone: { type: Sequelize.STRING(64), allowNull: false },
      input_hash: { type: Sequelize.CHAR(64), allowNull: false },
      created_at: now,
    });
    await queryInterface.addIndex('cost_calculations', ['delivery_id', 'id']);
    await queryInterface.sequelize.query(`
      CREATE FUNCTION cost_calculations_append_only() RETURNS trigger AS $fn$
      BEGIN
        RAISE EXCEPTION 'cost_calculations es append-only';
      END;
      $fn$ LANGUAGE plpgsql;
    `);
    await queryInterface.sequelize.query(`
      CREATE TRIGGER cost_calculations_no_update_delete
        BEFORE UPDATE OR DELETE ON cost_calculations
        FOR EACH ROW EXECUTE FUNCTION cost_calculations_append_only();
    `);

    // Anomalias visibles para operaciones: nunca se descartan en silencio.
    await queryInterface.createTable('anomalies', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(32), allowNull: false },
      delivery_id: { type: Sequelize.STRING(128), allowNull: false },
      merchant_id: { type: Sequelize.INTEGER, allowNull: true },
      event_id: { type: Sequelize.STRING(128), allowNull: true },
      detail: { type: Sequelize.JSONB, allowNull: true },
      // Evita repetir la misma anomalia en cada recalculo o reintento.
      dedup_key: { type: Sequelize.STRING(400), allowNull: false, unique: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: now,
    });
    await queryInterface.addIndex('anomalies', ['merchant_id', 'created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('anomalies');
    await queryInterface.sequelize.query(
      'DROP TRIGGER IF EXISTS cost_calculations_no_update_delete ON cost_calculations',
    );
    await queryInterface.dropTable('cost_calculations');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS cost_calculations_append_only()');
    await queryInterface.dropTable('delivery_events');
    await queryInterface.dropTable('deliveries');
  },
};
