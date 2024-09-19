# Dockerfile

# Use Debian Slim as the base image
FROM debian:stable-slim AS base

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

# Set environment variables
ENV BASE_URL="" PORT="" LOG_LEVEL="" LOG_MAX_SIZE="" LOG_MAX_FILES="" \
    YOGA_RESPONSE_CACHE_TTL="" COUCHBASE_URL="" COUCHBASE_USERNAME="" \
    COUCHBASE_BUCKET="" COUCHBASE_SCOPE="" COUCHBASE_COLLECTION="" \
    SERVICE_NAME="" SERVICE_VERSION="" DEPLOYMENT_ENVIRONMENT="" \
    TRACES_ENDPOINT="" METRICS_ENDPOINT="" LOGS_ENDPOINT="" \
    METRIC_READER_INTERVAL="" CONSOLE_METRIC_READER_INTERVAL="" \
    ENABLE_FILE_LOGGING="" ENABLE_OPENTELEMETRY="" SUMMARY_LOG_INTERVAL="" \
    ALLOWED_ORIGINS=""

WORKDIR /usr/src/app
ENV CN_ROOT=/usr/src/app

# Create necessary directories
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache && \
    chown -R root:root /usr/src/app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json ./
RUN bun install
COPY . .
COPY .env .env
CMD ["bun", "run", "dev"]

# Install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev /temp/prod
COPY package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile
COPY package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Prerelease stage
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build and test
ENV NODE_ENV=production
RUN bun test && \
    bun build ./src/index.ts --target=bun --outdir ./dist && \
    ls -R ./dist

# Final release stage
FROM base AS release
ENV NODE_ENV=production
ENV CN_ROOT=/usr/src/app
ENV CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache
ENV ENABLE_OPENTELEMETRY=true

COPY package.json ./
RUN bun install --production
COPY --from=prerelease /usr/src/app/dist ./dist
COPY src ./src

# Create bun user and group
RUN groupadd -r bun && useradd -r -g bun bun

# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app

# Run the application
USER bun
EXPOSE 4000/tcp
CMD ["bun", "run", "src/index.ts"]
