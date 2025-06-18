import express from "express";
import cors from "cors";
import path from "path";
import { config, corsConfig } from "./config";
import { AssetExtractor } from "./extractor";

const app = express();

// Configure CORS
app.use(cors(corsConfig));

// Serve static assets
app.use(
  "/assets",
  (_req, res, next) => {
    // Additional headers for static assets
    res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type");
    next();
  },
  express.static(path.join(__dirname, "../assets"))
);

// List available assets
app.get("/api/assets", (req, res) => {
  try {
    const extractor = new AssetExtractor(config.packages);
    const assets = extractor.getAvailableAssets();
    res.json({
      packages: Object.keys(assets),
      assets,
      totalFiles: Object.values(assets).reduce(
        (sum, files) => sum + files.length,
        0
      ),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve assets" });
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(config.port, () => {
  console.log(`📁 Assets available at: http://localhost:${config.port}/assets`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
  });
});

export { app };
