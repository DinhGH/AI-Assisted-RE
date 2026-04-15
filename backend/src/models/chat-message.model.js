const { DataTypes } = require("sequelize");

function defineChatMessageModel(sequelize) {
  return sequelize.define(
    "ChatMessage",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sessionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("system", "user", "assistant"),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
    },
    {
      tableName: "chat_messages",
      timestamps: true,
    },
  );
}

module.exports = defineChatMessageModel;
