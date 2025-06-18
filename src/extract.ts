import { AssetExtractor } from "./extractor";
import { config } from "./config";

async function main() {
  try {
    console.log("Starting asset extraction...");
    const extractor = new AssetExtractor(config.packages);
    await extractor.extractAssets();
    console.log("Asset extraction completed successfully.");
  } catch (error) {
    console.error("Error during asset extraction:", error);
    process.exit(1);
  }
}

main().catch(console.error);
