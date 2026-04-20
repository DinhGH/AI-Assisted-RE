const { DataTypes } = require("sequelize");

function defineVersionModel(sequelize) {
  return sequelize.define(
    "Version",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      requirementId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousText: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      previousScore: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      changedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "system",
      },
    },
    {
      tableName: "versions",
      timestamps: true,
    },
  );
}

module.exports = defineVersionModel;
