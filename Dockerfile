# Dockerfile

# Use a more lightweight base image
FROM oven/bun:1.1.43 AS base

LABEL maintainer="Simon Owusu simonowusupvh@gmail.com"
LABEL description="CapellaQL GraphQL Service"
LABEL version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/zx8086/capellaQL"

# Set common environment variables
ENV CN_ROOT=/usr/src/app \
    CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache

WORKDIR /usr/src/app

# Create necessary directories with proper permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache /usr/src/app/.sourcemaps && \
    chown -R bun:bun /usr/src/app

# Install dependencies stage
FROM base AS deps

# Copy package files
COPY --chown=bun:bun package.json bun.lockb ./

# Install dependencies
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile

# Development stage
FROM deps AS development
ENV NODE_ENV=development
COPY --chown=bun:bun . .
RUN bun install
CMD ["bun", "run", "dev"]

# Final release stage
FROM deps AS release

# Set production environment
ENV NODE_ENV=production \
    ENABLE_OPENTELEMETRY=true

# Copy source files with proper ownership
COPY --chown=bun:bun . .

# Install dependencies again to ensure they're available for the build
RUN bun install --production

# Add build step to generate source maps
RUN bun build ./src/index.ts \
    --target=node \
    --outdir ./dist \
    --sourcemap \
    --external dns \
    --external bun && \
    mkdir -p /usr/src/app/dist/maps && \
    mv /usr/src/app/dist/*.map /usr/src/app/dist/maps/

# Set runtime environment variables
ENV BASE_URL="" PORT="" LOG_LEVEL="" LOG_MAX_SIZE="" LOG_MAX_FILES="" \
    YOGA_RESPONSE_CACHE_TTL="" COUCHBASE_URL="" COUCHBASE_USERNAME="" \
    COUCHBASE_BUCKET="" COUCHBASE_SCOPE="" COUCHBASE_COLLECTION="" \
    SERVICE_NAME="" SERVICE_VERSION="" DEPLOYMENT_ENVIRONMENT="" \
    TRACES_ENDPOINT="" METRICS_ENDPOINT="" LOGS_ENDPOINT="" \
    METRIC_READER_INTERVAL="" CONSOLE_METRIC_READER_INTERVAL="" BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS="" \
    ENABLE_FILE_LOGGING="" SUMMARY_LOG_INTERVAL="" ALLOWED_ORIGINS="" \
    SOURCE_MAP_SUPPORT=true \
    PRESERVE_SOURCE_MAPS=true

# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app

# Switch to non-root user early
USER bun

EXPOSE 4000/tcp

# Add curl for healthcheck
RUN apk add --no-cache curl

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

CMD ["bun", "run", "start"]
