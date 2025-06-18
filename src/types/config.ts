export interface PackageConfig {
  name: string;
  version?: string;
  assetPaths: string[];
  outputDir: string;
}

export interface Config {
  packages: PackageConfig[];
  port: number;
  assetsDir: string;
}
