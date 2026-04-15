const { DataTypes } = require("sequelize");

function defineAnalysisResultModel(sequelize) {
  return sequelize.define(
    "AnalysisResult",
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
      rawResult: {
        type: DataTypes.JSON,
        allowNull: false,
      },
    },
    {
      tableName: "analysis_results",
      timestamps: true,
    },
  );
}

module.exports = defineAnalysisResultModel;
