'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserMerchant = sequelize.define(
    'UserMerchant',
    {
      userId: { type: DataTypes.INTEGER, primaryKey: true },
      merchantId: { type: DataTypes.INTEGER, primaryKey: true },
    },
    { tableName: 'user_merchants', underscored: true, timestamps: false },
  );

  return UserMerchant;
};
