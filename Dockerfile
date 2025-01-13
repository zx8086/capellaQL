# syntax=docker/dockerfile:1.4

# Base stage
FROM oven/bun:canary-alpine AS base

ARG BUILD_DATE
ARG BUILD_VERSION
ARG COMMIT_HASH

# Set common environment variables
ENV CN_ROOT=/usr/src/app \
    CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache

WORKDIR /usr/src/app

# Create directories (move to respective stages where needed)
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache /usr/src/app/.sourcemaps && \
    chown -R bun:bun /usr/src/app

# Dependencies stage - Optimized for caching
FROM base AS deps

# Copy only files needed for installation
COPY --chown=bun:bun package.json bun.lockb ./

# Install dependencies with improved caching
RUN --mount=type=cache,target=/root/.bun \
    bun install --frozen-lockfile && \
    # Ensure node_modules exists and is owned by bun
    mkdir -p node_modules && \
    chown -R bun:bun node_modules

# Development stage
FROM deps AS development
ENV NODE_ENV=development

# Copy source files after dependencies for better caching
COPY --chown=bun:bun . .
CMD ["bun", "run", "dev"]

# Build stage
FROM deps AS builder

# Copy source files
COPY --chown=bun:bun . .

# Build the application
RUN set -e; \
    echo "Building application..." && \
    bun build ./src/index.ts \
    --target=node \
    --outdir ./dist \
    --sourcemap \
    --external dns \
    --external bun \
    --manifest && \
    # Create and populate maps directory
    mkdir -p dist/maps && \
    find dist -name "*.map" -exec mv {} dist/maps/ \; || true

# Final release stage
FROM base AS release

# Copy only necessary files from previous stages
COPY --chown=bun:bun package.json bun.lockb ./
RUN --mount=type=cache,target=/root/.bun \
    bun install --production --frozen-lockfile

# Copy build artifacts
COPY --chown=bun:bun --from=builder /usr/src/app/dist ./dist

# Add labels in final stage
LABEL org.opencontainers.image.title="capellaql" \
    org.opencontainers.image.description="CapellaQL GraphQL Service" \
    org.opencontainers.image.version="2.0.0" \
    org.opencontainers.image.created="${BUILD_DATE}" \
    org.opencontainers.image.version="${BUILD_VERSION}" \
    org.opencontainers.image.revision="${COMMIT_HASH}" \
    org.opencontainers.image.authors="Simon Owusu <simonowusupvh@gmail.com>" \
    org.opencontainers.image.vendor="zx8086" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/zx8086/capellaql" \
    org.opencontainers.image.source="https://github.com/zx8086/capellaql" \
    org.opencontainers.image.documentation="https://github.com/zx8086/capellaql/README.md" \
    org.opencontainers.image.base.name="oven/bun:canary-alpine" \
    org.opencontainers.image.source.repository="github.com/zx8086/capellaql" \
    org.opencontainers.image.source.branch="${GITHUB_REF_NAME:-master}" \
    org.opencontainers.image.source.commit="${COMMIT_HASH}" \
    com.capellaql.maintainer="Simon Owusu <simonowusupvh@gmail.com>" \
    com.capellaql.release-date="${BUILD_DATE}" \
    com.capellaql.version.is-production="true"

# Set production environment variables
ENV NODE_ENV=production \
    ENABLE_OPENTELEMETRY=true \
    SOURCE_MAP_SUPPORT=true \
    PRESERVE_SOURCE_MAPS=true

# Set runtime environment variables
ENV BASE_URL="" \
    PORT="" \
    LOG_LEVEL="" \
    LOG_MAX_SIZE="" \
    LOG_MAX_FILES="" \
    YOGA_RESPONSE_CACHE_TTL="" \
    COUCHBASE_URL="" \
    COUCHBASE_USERNAME="" \
    COUCHBASE_BUCKET="" \
    COUCHBASE_SCOPE="" \
    COUCHBASE_COLLECTION="" \
    SERVICE_NAME="" \
    SERVICE_VERSION="" \
    DEPLOYMENT_ENVIRONMENT="" \
    TRACES_ENDPOINT="" \
    METRICS_ENDPOINT="" \
    LOGS_ENDPOINT="" \
    METRIC_READER_INTERVAL="" \
    CONSOLE_METRIC_READER_INTERVAL="" \
    BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS="" \
    ENABLE_FILE_LOGGING="" \
    SUMMARY_LOG_INTERVAL="" \
    ALLOWED_ORIGINS=""

USER bun
EXPOSE 4000/tcp

CMD ["bun", "run", "start"]
