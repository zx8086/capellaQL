# Dockerfile

# Use Debian Slim as the base image
FROM debian:stable-slim AS base

# Install necessary dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

ENV BASE_URL=""
ENV PORT=""
ENV LOG_LEVEL=""
ENV LOG_MAX_SIZE=""
ENV LOG_MAX_FILES=""
ENV YOGA_RESPONSE_CACHE_TTL=""
ENV COUCHBASE_URL=""
ENV COUCHBASE_USERNAME=""
ENV COUCHBASE_BUCKET=""
ENV COUCHBASE_SCOPE=""
ENV COUCHBASE_COLLECTION=""
ENV SERVICE_NAME=""
ENV SERVICE_VERSION=""
ENV DEPLOYMENT_ENVIRONMENT=""
ENV TRACES_ENDPOINT=""
ENV METRICS_ENDPOINT=""
ENV LOGS_ENDPOINT=""
ENV METRIC_READER_INTERVAL=""
ENV CONSOLE_METRIC_READER_INTERVAL=""
ENV ENABLE_FILE_LOGGING=""
ENV ENABLE_OPENTELEMETRY=""
ENV SUMMARY_LOG_INTERVAL=""
ENV ALLOWED_ORIGINS=""

WORKDIR /usr/src/app
ENV CN_ROOT=/usr/src/app

# Create necessary directories with the correct permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache && \
    chown -R root:root /usr/src/app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json bun.lockb ./
RUN bun install
COPY . .
COPY .env .env
CMD ["bun", "run", "dev"]

# install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun test
RUN bun build ./src/index.ts --target=node --outdir ./dist --no-minify
RUN ls -R ./dist
RUN cat ./dist/index.js

# copy production dependencies and source code into final image
FROM base AS release
ENV NODE_ENV=production
ENV CN_ROOT=/usr/src/app
ENV CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache
ENV ENABLE_OPENTELEMETRY=true

COPY package.json bun.lockb ./
RUN bun install
COPY . .

# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app

# run the application
USER root
EXPOSE 4000/tcp
CMD ["bun", "run", "src/index.ts"]
