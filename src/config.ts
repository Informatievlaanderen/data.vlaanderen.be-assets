import { Config } from "./types/config";
import { CorsOptions } from "cors";

export const config: Config = {
  assetsDir: "./assets",
  port: 3000,
  packages: [
    {
      name: "@govflanders/vl-ui-design-system-style",
      assetPaths: [
        "**/*.css",
        "**/*.woff",
        "**/*.woff2",
        "**/*.ttf",
        "**/*.eot",
        "**/*.svg",
        "**/fonts/**/*",
        "**/*.png", 
      ],
      outputDir: "./",
    },
  ],
};

export const corsConfig: CorsOptions = {
  origin: [
    "https://data.vlaanderen.be",
    "https://*.vlaanderen.be",
    "http://localhost:3000",
  ],
  methods: ["GET", "HEAD", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Length", "Content-Type"],
};
