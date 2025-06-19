import express from "express";
import cors from "cors";
import path from "path";
import { config, corsConfig } from "./config";
import { AssetExtractor } from "./extractor";

const app = express();

// Configure CORS
app.use(cors(corsConfig));

// Root endpoint with information
app.get("/", (_req, res) => {
  const extractor = new AssetExtractor(config.packages);
  const assets = extractor.getAvailableAssets();
  res.json({
    name: "data.vlaanderen.be-assets",
    description: "Self-hosted webuniversum assets",
    message: "Assets are served under /assets path",
    endpoints: {
      assets: "/assets/*",
    },
    packages: Object.keys(assets),
    assets,
    totalFiles: Object.values(assets).reduce(
      (sum, files) => sum + files.length,
      0
    ),
  });
});
// Remove fallthrough: false to allow requests to continue to other middleware
app.use(
  "/",
  (_req, res, next) => {
    res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type");
    next();
  },
  express.static(path.join(__dirname, "../assets"))
  // Removed fallthrough: false - this was causing the 404s
);

const server = app.listen(config.port, () => {
  console.log(`📁 Assets available at: http://localhost:${config.port}/`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
  });
});

export { app };
