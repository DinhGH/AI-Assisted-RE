const { DataTypes } = require("sequelize");

function defineRequirementModel(sequelize) {
  return sequelize.define(
    "Requirement",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      documentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requirementCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      text: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      actor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      object: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ambiguity: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      readability: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      similarity: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      contradiction: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      clarity: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      completeness: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      consistency: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      score: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "analyzed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "requirements",
      timestamps: true,
    },
  );
}

module.exports = defineRequirementModel;
