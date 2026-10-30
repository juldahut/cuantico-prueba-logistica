'use strict';

module.exports = (sequelize, DataTypes) => {
  const Anomaly = sequelize.define(
    'Anomaly',
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(32), allowNull: false },
      deliveryId: { type: DataTypes.STRING(128), allowNull: false },
      merchantId: { type: DataTypes.INTEGER },
      eventId: { type: DataTypes.STRING(128) },
      detail: { type: DataTypes.JSONB },
      dedupKey: { type: DataTypes.STRING(400), allowNull: false, unique: true },
      resolvedAt: { type: DataTypes.DATE },
    },
    { tableName: 'anomalies', underscored: true, updatedAt: false },
  );

  return Anomaly;
};
