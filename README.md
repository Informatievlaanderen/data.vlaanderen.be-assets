# data.vlaanderen.be-assets

A project to self-host all static webuniversum assets for data.vlaanderen.be

## Overview

This Node.js application extracts and serves static assets from Flemish Government webuniversum npm packages, providing a centralized asset hosting solution for data.vlaanderen.be. The application automatically extracts static assets, such as CSS and fonts from configured npm packages and serves them via a web server.

## Project Structure

```
├── src/
│   ├── app.ts              # Express application server
│   ├── config.ts           # Package configuration
│   ├── extract.ts          # Asset extraction script
│   ├── extractor.ts        # Asset extraction logic
│   └── types/
│       └── config.ts       # TypeScript type definitions
├── assets/
│   └── styles/             # Destination for extracted assets
├── .npmrc                 # npm configuration for private packages
├── .env                   # Environment variables configuration
├── Dockerfile              # Docker container configuration
```

## Installation

### Prerequisites

- Node.js 24+ or Docker
- Yarn package manager
- Access to Flemish Government npm packages (configured in [.npmrc](.npmrc))

### Local Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd data.vlaanderen.be-assets
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Extract assets from npm packages**

   ```bash
   yarn extract
   ```

4. **Start the development server**

   ```bash
   yarn dev
   ```

5. **Access the application**
   - Assets: http://localhost:3000/assets
   - Health check: http://localhost:3000/health
   - API: http://localhost:3000/api/assets

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
make build
# or specifically for Linux distributions
make build-linux

# Run the container
make run
```

## Configuration

Asset extraction is configured in [`src/config.ts`](src/config.ts). Add or modify packages in the `packages` array:

```typescript
export const config: Config = {
  assetsDir: "./assets",
  port: 3000,
  packages: [
    {
      name: "{PAKKAGE_NAME}",
      assetPaths: ["{PATH_TO_ASSETS}"],
      outputDir: "{OUTPUT_DIRECTORY}",
    },
  ],
};
```

## API Endpoints

| Endpoint      | Method | Description              |
| ------------- | ------ | ------------------------ |
| `/`           | GET    | Application information  |
| `/assets/*`   | GET    | Static asset files       |
| `/health`     | GET    | Health check status      |
| `/api/assets` | GET    | List of available assets |

## Scripts

- `yarn build` - Compile TypeScript to JavaScript
- `yarn start` - Start the production server
- `yarn dev` - Start the development server with hot reload
- `yarn extract` - Extract assets from configured npm packages
- `yarn clean` - Remove compiled JavaScript files

## Development

### Adding New Packages

1. Install the npm package: `yarn add @govflanders/new-package`
2. Add configuration to [`src/config.ts`](src/config.ts)
3. Run extraction: `yarn extract`
4. Test the assets are available via the web server

## License

MIT License - see [LICENSE](LICENSE) for details.
