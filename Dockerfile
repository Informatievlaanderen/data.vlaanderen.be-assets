FROM node:24-alpine


# Set working directory
WORKDIR /app

# Add the npm token as a build argument
# NPM_TOKEN is needed for private packages of @govflanders
ARG NPM_TOKEN
RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > /app/.npmrc

# Copy package files
COPY package.json yarn.lock ./
COPY .npmrc ./


# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies
RUN yarn install 

# Copy existing assets
COPY assets/ ./assets/

# Build and extract assets
RUN yarn build && yarn extract

# Expose port
EXPOSE 3000

# Serve the assets directory
CMD ["node", "dist/app.js"]