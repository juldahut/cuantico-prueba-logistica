'use strict';

module.exports = (sequelize, DataTypes) => {
  const Courier = sequelize.define(
    'Courier',
    { name: { type: DataTypes.STRING(120), allowNull: false } },
    { tableName: 'couriers', underscored: true },
  );

  Courier.associate = (db) => {
    Courier.hasMany(db.Delivery, { foreignKey: 'courierId', as: 'deliveries' });
  };

  return Courier;
};
