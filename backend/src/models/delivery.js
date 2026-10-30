'use strict';

module.exports = (sequelize, DataTypes) => {
  const Delivery = sequelize.define(
    'Delivery',
    {
      id: { type: DataTypes.STRING(128), primaryKey: true },
      merchantId: { type: DataTypes.INTEGER, allowNull: false },
      courierId: { type: DataTypes.INTEGER },
      address: { type: DataTypes.STRING(200) },
      status: { type: DataTypes.STRING(20), allowNull: false },
      completedAt: { type: DataTypes.DATE },
      costStatus: { type: DataTypes.STRING(20) },
      costAmount: { type: DataTypes.INTEGER },
      currency: { type: DataTypes.CHAR(3) },
    },
    { tableName: 'deliveries', underscored: true },
  );

  Delivery.associate = (db) => {
    Delivery.belongsTo(db.Merchant, { foreignKey: 'merchantId', as: 'merchant' });
    Delivery.belongsTo(db.Courier, { foreignKey: 'courierId', as: 'courier' });
    Delivery.hasMany(db.DeliveryEvent, { foreignKey: 'deliveryId', as: 'events' });
    Delivery.hasMany(db.CostCalculation, { foreignKey: 'deliveryId', as: 'calculations' });
  };

  return Delivery;
};
