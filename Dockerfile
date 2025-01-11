# Dockerfile

# Use a more lightweight base image
FROM oven/bun:slim AS base

# Set common environment variables
ENV CN_ROOT=/usr/src/app \
    CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache

WORKDIR /usr/src/app

# Create necessary directories
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache

# Install dependencies stage
FROM base AS deps

# Copy only package.json and lockfile
COPY package.json bun.lockb ./

# Install dependencies
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile

# Development stage
FROM deps AS development
ENV NODE_ENV=development
COPY . .
CMD ["bun", "run", "dev"]

# Final release stage
FROM deps AS release
ENV NODE_ENV=production \
    ENABLE_OPENTELEMETRY=true

# Copy all source files
COPY . .

# Set runtime environment variables
ENV BASE_URL="" PORT="" LOG_LEVEL="" LOG_MAX_SIZE="" LOG_MAX_FILES="" \
    YOGA_RESPONSE_CACHE_TTL="" COUCHBASE_URL="" COUCHBASE_USERNAME="" \
    COUCHBASE_BUCKET="" COUCHBASE_SCOPE="" COUCHBASE_COLLECTION="" \
    SERVICE_NAME="" SERVICE_VERSION="" DEPLOYMENT_ENVIRONMENT="" \
    TRACES_ENDPOINT="" METRICS_ENDPOINT="" LOGS_ENDPOINT="" \
    METRIC_READER_INTERVAL="" CONSOLE_METRIC_READER_INTERVAL="" BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS="" \
    ENABLE_FILE_LOGGING="" SUMMARY_LOG_INTERVAL="" ALLOWED_ORIGINS=""

# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app

# Run the application
USER bun
EXPOSE 4000/tcp
CMD ["bun", "run", "start"]
