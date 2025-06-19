FROM node:24-alpine

# Set working directory
WORKDIR /app

# Add the npm token as a build argument
# NPM_TOKEN is needed for private packages of @govflanders
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > /app/.npmrc

# Copy package files first
COPY package.json ./
COPY .npmrc ./

# Install dependencies first
RUN yarn install --frozen-lockfile

# Copy source code after dependencies are installed
COPY tsconfig.json ./
COPY src/ ./src/

# Copy existing assets before extraction
COPY assets/ ./assets/

# Build TypeScript first (before extraction which needs the compiled code)
RUN yarn build

# Extract assets 
RUN yarn extract

# Expose port
EXPOSE 3000

# Serve the assets directory
CMD ["node", "dist/app.js"]