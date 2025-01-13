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
RUN --mount=type=cache,target=/root/.bun,sharing=locked \
    bun install --frozen-lockfile && \
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
RUN --mount=type=cache,target=/usr/src/app/.build \
    set -ex; \
    echo "Building application..." && \
    bun build ./src/index.ts \
    --target=node \
    --outdir ./dist \
    --sourcemap \
    --external dns \
    --external bun \
    --manifest && \
    mkdir -p dist/maps && \
    find dist -name "*.map" -exec mv {} dist/maps/ \; || true

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
RUN set -e; \
    echo "Building application..." && \
    bun build ./src/index.ts \
    --target=node \
    --outdir ./dist \
    --sourcemap \
    --external dns \
    --external bun \
    --manifest && \
    echo "Build output contents:" && \
    ls -la /usr/src/app/dist/ && \
    echo "Creating maps directory..." && \
    mkdir -p /usr/src/app/dist/maps && \
    echo "Looking for source maps..." && \
    if find /usr/src/app/dist -name "*.map" -exec mv {} /usr/src/app/dist/maps/ \; ; then \
    echo "Source maps moved successfully"; \
    else \
    echo "No source maps found to move"; \
    fi && \
    echo "Build process completed"

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

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD bun run healthcheck || exit 1

CMD ["bun", "run", "start"]
