'use strict';

module.exports = (sequelize, DataTypes) => {
  const DeliveryEvent = sequelize.define(
    'DeliveryEvent',
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      eventId: { type: DataTypes.STRING(128), allowNull: false, unique: true },
      deliveryId: { type: DataTypes.STRING(128), allowNull: false },
      merchantId: { type: DataTypes.INTEGER, allowNull: false },
      type: { type: DataTypes.STRING(20), allowNull: false },
      occurredAt: { type: DataTypes.DATE, allowNull: false },
      payload: { type: DataTypes.JSONB, allowNull: false },
      payloadHash: { type: DataTypes.CHAR(64), allowNull: false },
      receivedAt: { type: DataTypes.DATE },
    },
    { tableName: 'delivery_events', underscored: true, timestamps: false },
  );

  DeliveryEvent.associate = (db) => {
    DeliveryEvent.belongsTo(db.Delivery, { foreignKey: 'deliveryId', as: 'delivery' });
  };

  return DeliveryEvent;
};
