'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
      role: { type: DataTypes.STRING(20), allowNull: false },
    },
    {
      tableName: 'users',
      underscored: true,
      // El hash nunca sale en una consulta por defecto.
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withPassword: {} },
    },
  );

  User.associate = (db) => {
    User.belongsToMany(db.Merchant, {
      through: db.UserMerchant,
      foreignKey: 'userId',
      otherKey: 'merchantId',
      as: 'merchants',
    });
  };

  return User;
};
