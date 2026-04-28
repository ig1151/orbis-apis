"use strict";
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const healthRoute = require("./routes/health");
const quoteRoute = require("./routes/quote");
const watchlistRoute = require("./routes/watchlist");
const marketStatusRoute = require("./routes/marketStatus");
const chartRoute = require("./routes/chart");
const searchRoute = require("./routes/search");
const fundamentalsRoute = require("./routes/fundamentals");
const meRoute = require("./routes/me");
const adminRoute = require("./routes/admin");

const { planLimiter } = require("./middleware/planLimiter");
const { rateLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const registerRoute = require("./routes/register");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./utils/swagger");

const app = express();

if (!process.env.ADMIN_SECRET) {
  console.warn("[WARNING] ADMIN_SECRET is not set - admin routes are unsecured");
}

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "market-snapshot-api",
      version: "2.0.0",
      endpoints: [
        "/health",
        "/quote?ticker=AAPL",
        "/watchlist?tickers=AAPL,MSFT",
        "/market-status",
        "/me"
      ]
    }
  });
});

app.use("/health", healthRoute);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (req, res) => res.json(swaggerSpec));
app.use("/register", registerRoute);
app.use("/admin", adminRoute);

app.use(rateLimiter);

app.use("/me", meRoute);
app.use("/quote", quoteRoute);
app.use("/watchlist", watchlistRoute);
app.use("/market-status", marketStatusRoute);
app.use("/chart", chartRoute);
app.use("/search", searchRoute);
app.use("/fundamentals", fundamentalsRoute);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[market-snapshot-api] running on http://localhost:${PORT}`));

module.exports = app;
