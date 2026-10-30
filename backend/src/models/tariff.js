'use strict';

module.exports = (sequelize, DataTypes) => {
  const Tariff = sequelize.define(
    'Tariff',
    {
      merchantId: { type: DataTypes.INTEGER, allowNull: false },
      baseAmount: { type: DataTypes.INTEGER, allowNull: false },
      perKmAmount: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.CHAR(3), allowNull: false },
      validFrom: { type: DataTypes.DATE, allowNull: false },
      validTo: { type: DataTypes.DATE },
    },
    { tableName: 'tariffs', underscored: true },
  );

  Tariff.associate = (db) => {
    Tariff.belongsTo(db.Merchant, { foreignKey: 'merchantId', as: 'merchant' });
  };

  return Tariff;
};
