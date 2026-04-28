"use strict";
require("dotenv").config();
const express = require("express");
const helmet  = require("helmet");
const cors    = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");

const healthRoute    = require("./routes/health");
const sentimentRoute = require("./routes/sentiment");
const trendingRoute  = require("./routes/trending");
const signalsRoute   = require("./routes/signals");
const registerRoute  = require("./routes/register");

const { apiKeyMiddleware } = require("./middleware/apiKey");
const { rateLimiter }      = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Public routes
app.use("/health",   healthRoute);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (req, res) => res.json(swaggerSpec));
app.use("/register", registerRoute);

const cryptoSentimentRoute = require("./routes/cryptoSentiment");
app.use("/crypto-sentiment", cryptoSentimentRoute);

// Protected routes
app.use(apiKeyMiddleware);
app.use(rateLimiter);
app.use("/sentiment",    sentimentRoute);
app.use("/trending",     trendingRoute);
app.use("/signals",      signalsRoute);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[social-sentiment-api] running on http://localhost:${PORT}`)
);

module.exports = app;