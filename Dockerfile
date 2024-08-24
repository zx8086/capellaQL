# Dockerfile

# use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app
ENV CN_ROOT=/usr/src/app
# Create necessary directories with the correct permissions
RUN mkdir -p /usr/src/app/logs /usr/src/app/src/db /usr/src/app/deps/couchbase-cxx-cache && \
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
# Copy any additional necessary files
# COPY --from=prerelease /usr/src/app/.env.example ./dist/.env
COPY --from=prerelease /usr/src/app/deps ./deps
# Set ownership of app directory to bun user
RUN chown -R bun:bun /usr/src/app
# run the app
USER bun
EXPOSE 4000/tcp
ENV CN_CXXCBC_CACHE_DIR=/usr/src/app/deps/couchbase-cxx-cache
RUN cat /usr/src/app/dist/index.js | head -n 200 > /tmp/bundle-head.log
ENTRYPOINT ["bun", "run", "--preload", "/usr/src/app/set-global.js", "dist/index.js"]
