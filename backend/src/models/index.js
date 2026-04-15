const { Sequelize } = require("sequelize");
const config = require("../config");
const logger = require("../utils/logger");
const defineRequirementModel = require("./requirement.model");
const defineDocumentModel = require("./document.model");
const defineAnalysisResultModel = require("./analysis-result.model");
const defineVersionModel = require("./version.model");
const defineChatMessageModel = require("./chat-message.model");

const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: "mysql",
    logging: false,
  },
);

const Document = defineDocumentModel(sequelize);
const Requirement = defineRequirementModel(sequelize);
const AnalysisResult = defineAnalysisResultModel(sequelize);
const Version = defineVersionModel(sequelize);
const ChatMessage = defineChatMessageModel(sequelize);

Document.hasMany(Requirement, { foreignKey: "documentId", as: "requirements" });
Requirement.belongsTo(Document, { foreignKey: "documentId", as: "document" });

Requirement.hasMany(AnalysisResult, {
  foreignKey: "requirementId",
  as: "analysisResults",
});
AnalysisResult.belongsTo(Requirement, {
  foreignKey: "requirementId",
  as: "requirement",
});

Requirement.hasMany(Version, { foreignKey: "requirementId", as: "versions" });
Version.belongsTo(Requirement, {
  foreignKey: "requirementId",
  as: "requirement",
});

async function initDatabase() {
  await sequelize.authenticate();

  /**
   * WHY: We use alter=true during this stage to keep schema aligned quickly
   * while iterating. For production migrations, swap this for migration files.
   */
  await sequelize.sync({ alter: true });
  logger.info("Database initialized");
}

module.exports = {
  sequelize,
  initDatabase,
  models: {
    Document,
    Requirement,
    AnalysisResult,
    Version,
    ChatMessage,
  },
};
