const express = require("express");
const cors = require("cors");
const requirementRoutes = require("./routes/requirement.routes");
const { errorMiddleware } = require("./middlewares/error.middleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/", requirementRoutes);

app.use(errorMiddleware);

module.exports = app;
