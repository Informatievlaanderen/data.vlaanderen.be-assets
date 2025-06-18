import * as fs from "fs";
import * as path from "path";
import type { PackageConfig } from "./types/config";

export class AssetExtractor {
  constructor(private packages: PackageConfig[]) {}

  /**
   * Extract assets from specified npm packages
   */
  async extractAssets(): Promise<void> {
    console.log("Starting asset extraction...");

    for (const pkg of this.packages) {
      console.log(`Extracting assets from ${pkg.name}...`);
      try {
        await this.extractPackageAssets(pkg);
        console.log(`✓ Extracted assets from ${pkg.name}`);
      } catch (error) {
        console.error(`✗ Failed to extract assets from ${pkg.name}:`, error);
      }
    }

    console.log("Asset extraction completed");
  }

  /**
   * Extract assets from a single package
   */
  private async extractPackageAssets(pkg: PackageConfig): Promise<void> {
    const packagePath = path.join("node_modules", pkg.name);
    const outputPath = path.join("assets", pkg.outputDir);

    // Ensure output directory exists
    await this.ensureDirectory(outputPath);

    // Copy assets based on configured paths
    for (const assetPath of pkg.assetPaths) {
      const sourcePath = path.join(packagePath, assetPath);
      await this.copyAssets(sourcePath, outputPath, assetPath);
    }
  }

  /**
   * Copy assets from source to destination
   */
  private async copyAssets(
    sourcePath: string,
    outputPath: string,
    pattern: string
  ): Promise<void> {
    const glob = await import("glob");

    const files = glob.globSync(sourcePath);

    for (const file of files) {
      const relativePath = path.relative(path.join("node_modules"), file);
      const destPath = path.join(outputPath, path.basename(file));

      await this.copyFile(file, destPath);
    }
  }

  /**
   * Copy a single file
   */
  private async copyFile(source: string, destination: string): Promise<void> {
    await this.ensureDirectory(path.dirname(destination));

    return new Promise((resolve, reject) => {
      fs.copyFile(source, destination, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err && err.code !== "EEXIST") reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get list of available assets
   */
  getAvailableAssets(): { [key: string]: string[] } {
    const assets: { [key: string]: string[] } = {};

    for (const pkg of this.packages) {
      const assetDir = path.join("assets", pkg.outputDir);
      if (fs.existsSync(assetDir)) {
        assets[pkg.name] = this.getFilesInDirectory(assetDir);
      }
    }

    return assets;
  }

  /**
   * Get all files in a directory recursively
   */
  private getFilesInDirectory(dirPath: string): string[] {
    const files: string[] = [];

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesInDirectory(itemPath));
      } else {
        files.push(path.relative("assets", itemPath));
      }
    }

    return files;
  }
}
