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

    // Post-process CSS files to fix font paths after all assets are copied
    if (pkg.name.includes("design-system-style")) {
      await this.fixCssFontPaths(outputPath, pkg.name);
    }

    // Post-process JS files for browser compatibility
    if (pkg.name.includes("design-system-vanilla")) {
      await this.fixJavaScriptFiles(outputPath);
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
   * Fix JavaScript files for browser compatibility
   */
  private async fixJavaScriptFiles(outputPath: string): Promise<void> {
    const jsFiles = glob.globSync(path.join(outputPath, "**/*.js"));

    for (const jsFile of jsFiles) {
      try {
        let content = fs.readFileSync(jsFile, "utf-8");
        let hasChanges = false;

        // Remove ES6 module exports to make it browser-compatible
        const exportPatterns = [
          /export\s*{\s*[^}]*\s*}\s*;?\s*$/gm, // export { something };
          /export\s+default\s+[^;]*;?\s*$/gm,   // export default something;
          /export\s*\{[^}]*\}\s*;?\s*$/gm,      // export {item as default};
        ];

        exportPatterns.forEach(pattern => {
          const originalContent = content;
          content = content.replace(pattern, '');
          if (originalContent !== content) {
            hasChanges = true;
          }
        });

        // Also remove any import statements that might cause issues
        const importPattern = /import\s+.*?\s+from\s+['"][^'"]*['"];?\s*/gm;
        const originalContent = content;
        content = content.replace(importPattern, '');
        if (originalContent !== content) {
          hasChanges = true;
          console.log(`  Removed import statements from: ${path.relative(outputPath, jsFile)}`);
        }

        if (hasChanges) {
          fs.writeFileSync(jsFile, content);
          console.log(`  ✓ Fixed JavaScript file: ${path.relative(outputPath, jsFile)}`);
        }
      } catch (error) {
        console.warn(`Failed to fix JavaScript file ${jsFile}:`, error);
      }
    }
  }

  /**
   * Fix font paths in CSS files after extraction
   */
  private async fixCssFontPaths(
    outputPath: string,
    packageName: string
  ): Promise<void> {
    const cssFiles = glob.globSync(path.join(outputPath, "**/*.css"));

    for (const cssFile of cssFiles) {
      try {
        let content = fs.readFileSync(cssFile, "utf-8");
        let hasChanges = false;

        // Fix paths that reference the npm package directly
        const packagePattern = new RegExp(
          `url\\(["']?${packageName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}/([^"')]+)["']?\\)`,
          "gi"
        );

        content = content.replace(packagePattern, (match, assetPath) => {
          hasChanges = true;
          // Convert the asset path to our local structure
          const cleanedAssetPath = this.removeBuildAssetsFromPath(assetPath);
          const localPath = `/assets/${cleanedAssetPath}`;
          console.log(`  Fixed asset path: ${match} -> url("${localPath}")`);
          return `url("${localPath}")`;
        });

        // Also fix any other common npm package patterns
        const genericPackagePattern =
          /url\(["']?@[^/]+\/[^/]+\/([^"')]+)["']?\)/gi;
        content = content.replace(genericPackagePattern, (match, assetPath) => {
          // Process if it contains font or image-related paths
          if (
            assetPath.includes("font") ||
            assetPath.includes("image") ||
            assetPath.includes("favicon") ||
            assetPath.includes("icon") ||
            assetPath.includes(".woff") ||
            assetPath.includes(".ttf") ||
            assetPath.includes(".eot") ||
            assetPath.includes(".png") ||
            assetPath.includes(".jpg") ||
            assetPath.includes(".jpeg") ||
            assetPath.includes(".svg")
          ) {
            hasChanges = true;
            const cleanedAssetPath = this.removeBuildAssetsFromPath(assetPath);
            const localPath = `/assets/${cleanedAssetPath}`;
            console.log(`  Fixed asset path: ${match} -> url("${localPath}")`);
            return `url("${localPath}")`;
          }
          return match;
        });

        // Fix relative paths that might be broken due to restructuring
        content = content.replace(
          /url\(["']?\.\.\/[^"')]*\.(woff2?|ttf|eot|svg)(\?[^"')]*)?["']?\)/gi,
          (match, ext, query) => {
            const fontFileMatch = match.match(/([^/]+\.(woff2?|ttf|eot|svg))/i);
            if (fontFileMatch) {
              hasChanges = true;
              const fontFileName = fontFileMatch[1];
              const localPath = `/assets/font/flanders/sans/${fontFileName}${
                query || ""
              }`;
              console.log(
                `  Fixed relative font path: ${match} -> url("${localPath}")`
              );
              return `url("${localPath}")`;
            }
            return match;
          }
        );

        if (hasChanges) {
          fs.writeFileSync(cssFile, content);
          console.log(
            `  ✓ Updated asset paths in: ${path.relative(outputPath, cssFile)}`
          );
        }
      } catch (error) {
        console.warn(`Failed to fix paths in CSS file ${cssFile}:`, error);
      }
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