'use strict';

module.exports = (sequelize, DataTypes) => {
  const Merchant = sequelize.define(
    'Merchant',
    {
      name: { type: DataTypes.STRING(120), allowNull: false },
      timeZone: { type: DataTypes.STRING(64), allowNull: false },
      // Dato NO confiable: nunca se usa como instruccion ni va al system prompt.
      notes: { type: DataTypes.TEXT },
      deliveryInstructions: { type: DataTypes.TEXT },
    },
    { tableName: 'merchants', underscored: true },
  );

  Merchant.associate = (db) => {
    Merchant.hasMany(db.Tariff, { foreignKey: 'merchantId', as: 'tariffs' });
    Merchant.hasMany(db.Delivery, { foreignKey: 'merchantId', as: 'deliveries' });
  };

  return Merchant;
};
