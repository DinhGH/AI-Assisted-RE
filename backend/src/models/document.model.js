const { DataTypes } = require("sequelize");

function defineDocumentModel(sequelize) {
  return sequelize.define(
    "Document",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      filename: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mimeType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
    },
    {
      tableName: "documents",
      timestamps: true,
    },
  );
}

module.exports = defineDocumentModel;
