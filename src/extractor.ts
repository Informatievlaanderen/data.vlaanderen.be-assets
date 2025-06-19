import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import type { PackageConfig } from "./types/config";

export class AssetExtractor {
  constructor(private packages: PackageConfig[]) {}

  /**
   * Extract assets from specified npm packages
   */
  async extractAssets(): Promise<void> {
    console.log("Starting asset extraction...");

    for (const pkg of this.packages) {
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

    if (!fs.existsSync(packagePath)) {
      throw new Error(`Package ${pkg.name} not found in node_modules`);
    }

    // Ensure output directory exists
    await this.ensureDirectory(outputPath);

    // Copy assets based on configured paths
    for (const assetPath of pkg.assetPaths) {
      const sourcePath = path.join(packagePath, assetPath);
      await this.copyAssets(sourcePath, packagePath, outputPath);
    }
  }

  /**
   * Copy assets from source to destination, preserving directory structure but removing /build/assets
   */
  private async copyAssets(
    pattern: string,
    packageRoot: string,
    outputPath: string
  ): Promise<void> {
    try {
      const files = glob.globSync(pattern);

      for (const file of files) {
        const stat = fs.statSync(file);

        if (stat.isFile()) {
          // Calculate relative path from package root
          const relativePath = path.relative(packageRoot, file);

          // Remove 'build/assets/' from the beginning of the path if it exists
          const cleanedPath = this.removeBuildAssetsFromPath(relativePath);

          const destPath = path.join(outputPath, cleanedPath);

          await this.copyFile(file, destPath);
          console.log(
            `  Copied: ${relativePath} -> ${path.relative("assets", destPath)}`
          );
        } else if (stat.isDirectory()) {
          // Create directory structure (also removing build/assets from path)
          const relativePath = path.relative(packageRoot, file);
          const cleanedPath = this.removeBuildAssetsFromPath(relativePath);

          // Only create directory if there's actually a path left after cleaning
          if (cleanedPath) {
            const destPath = path.join(outputPath, cleanedPath);
            await this.ensureDirectory(destPath);
            console.log(`  Created directory: ${cleanedPath}`);
          }
        }
      }
    } catch (error) {
      console.warn(`No files found for pattern: ${pattern}`);
    }
  }

  /**
   * Remove 'build/assets/' from the beginning of a path
   */
  private removeBuildAssetsFromPath(filePath: string): string {
    const segments = filePath.split(path.sep);

    // Remove 'build' and 'assets' from the beginning if they exist
    let startIndex = 0;

    if (segments[0] === "build") {
      startIndex = 1;
    }

    if (segments[startIndex] === "assets") {
      startIndex++;
    }

    // Return the remaining path segments
    const remainingSegments = segments.slice(startIndex);
    return remainingSegments.join(path.sep);
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

    if (!fs.existsSync(dirPath)) {
      return files;
    }

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
