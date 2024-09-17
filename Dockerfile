# Dockerfile

# use the official Bun image
FROM oven/bun:latest AS base

ARG BASE_URL
ARG PORT
ARG LOG_LEVEL
ARG LOG_MAX_SIZE
ARG LOG_MAX_FILES
ARG YOGA_RESPONSE_CACHE_TTL
ARG COUCHBASE_URL
ARG COUCHBASE_USERNAME
ARG COUCHBASE_PASSWORD
ARG COUCHBASE_BUCKET
ARG COUCHBASE_SCOPE
ARG COUCHBASE_COLLECTION
ARG SERVICE_NAME
ARG SERVICE_VERSION
ARG DEPLOYMENT_ENVIRONMENT
ARG TRACES_ENDPOINT
ARG METRICS_ENDPOINT
ARG LOGS_ENDPOINT
ARG METRIC_READER_INTERVAL
ARG CONSOLE_METRIC_READER_INTERVAL
ARG ENABLE_FILE_LOGGING
ARG ENABLE_OPENTELEMETRY
ARG SUMMARY_LOG_INTERVAL
ARG ALLOWED_ORIGINS

ENV BASE_URL=${BASE_URL}
ENV PORT=${PORT}
ENV LOG_LEVEL=${LOG_LEVEL}
ENV LOG_MAX_SIZE=${LOG_MAX_SIZE}
ENV LOG_MAX_FILES=${LOG_MAX_FILES}
ENV YOGA_RESPONSE_CACHE_TTL=${YOGA_RESPONSE_CACHE_TTL}
ENV COUCHBASE_URL=${COUCHBASE_URL}
ENV COUCHBASE_USERNAME=${COUCHBASE_USERNAME}
ENV COUCHBASE_PASSWORD=${COUCHBASE_PASSWORD}
ENV COUCHBASE_BUCKET=${COUCHBASE_BUCKET}
ENV COUCHBASE_SCOPE=${COUCHBASE_SCOPE}
ENV COUCHBASE_COLLECTION=${COUCHBASE_COLLECTION}
ENV SERVICE_NAME=${SERVICE_NAME}
ENV SERVICE_VERSION=${SERVICE_VERSION}
ENV DEPLOYMENT_ENVIRONMENT=${DEPLOYMENT_ENVIRONMENT}
ENV TRACES_ENDPOINT=${TRACES_ENDPOINT}
ENV METRICS_ENDPOINT=${METRICS_ENDPOINT}
ENV LOGS_ENDPOINT=${LOGS_ENDPOINT}
ENV METRIC_READER_INTERVAL=${METRIC_READER_INTERVAL}
ENV CONSOLE_METRIC_READER_INTERVAL=${CONSOLE_METRIC_READER_INTERVAL}
ENV ENABLE_FILE_LOGGING=${ENABLE_FILE_LOGGING}
ENV ENABLE_OPENTELEMETRY=${ENABLE_OPENTELEMETRY}
ENV SUMMARY_LOG_INTERVAL=${SUMMARY_LOG_INTERVAL}
ENV ALLOWED_ORIGINS=${ALLOWED_ORIGINS}

WORKDIR /usr/src/app
ENV CN_ROOT=/usr/src/app

# Create necessary directories with the correct permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/deps/couchbase-cxx-cache && \
    chown -R bun:bun /usr/src/app

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
RUN bun build ./src/index.ts --target=node --outdir ./dist

# copy production dependencies and source code into final image
FROM base AS release
ENV NODE_ENV=production
ENV CN_ROOT=/usr/src/app
ENV CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache
RUN echo "globalThis.CN_ROOT = '/usr/src/app';" > /usr/src/app/set-global.js
RUN echo "globalThis.CXXCBC_CACHE_DIR = '/usr/src/app/deps/couchbase-cxx-cache';" >> /usr/src/app/set-global.js
RUN echo "globalThis.ENV_TRUE = ['true', '1', 'y', 'yes', 'on'];" >> /usr/src/app/set-global.js
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/dist/ ./dist/
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/deps ./deps

# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app

# run the application
USER bun
EXPOSE 4000/tcp
ENV CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache
ENTRYPOINT ["bun", "run", "--preload", "/usr/src/app/set-global.js", "dist/index.js"]
