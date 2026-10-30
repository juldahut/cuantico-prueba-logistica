'use strict';

// Append-only: un trigger en la BD rechaza UPDATE y DELETE.
module.exports = (sequelize, DataTypes) => {
  const CostCalculation = sequelize.define(
    'CostCalculation',
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      deliveryId: { type: DataTypes.STRING(128), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false },
      amount: { type: DataTypes.INTEGER },
      currency: { type: DataTypes.CHAR(3), allowNull: false },
      rulesVersion: { type: DataTypes.STRING(16), allowNull: false },
      breakdown: { type: DataTypes.JSONB },
      distanceMeters: { type: DataTypes.INTEGER },
      isNight: { type: DataTypes.BOOLEAN },
      reason: { type: DataTypes.STRING(32) },
      eventIds: { type: DataTypes.JSONB, allowNull: false },
      tariffId: { type: DataTypes.INTEGER, allowNull: false },
      tariffSnapshot: { type: DataTypes.JSONB, allowNull: false },
      timeZone: { type: DataTypes.STRING(64), allowNull: false },
      inputHash: { type: DataTypes.CHAR(64), allowNull: false },
    },
    { tableName: 'cost_calculations', underscored: true, updatedAt: false },
  );

  CostCalculation.associate = (db) => {
    CostCalculation.belongsTo(db.Delivery, { foreignKey: 'deliveryId', as: 'delivery' });
  };

  return CostCalculation;
};
