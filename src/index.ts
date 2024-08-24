/* src/index.ts */

import { Elysia } from "elysia";
import config from "./config";
import { yoga } from "@elysiajs/graphql-yoga";
import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import { execute, parse, specifiedRules, subscribe, validate } from "graphql";
import { useEngine } from "@envelop/core";
import { usePrometheus } from "@envelop/prometheus";
import { log, err } from "$utils/logger";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof globalThis.CN_ROOT === "undefined") {
  globalThis.CN_ROOT = process.env.CN_ROOT || path.resolve(__dirname, "..");
}

if (typeof globalThis.CXXCBC_CACHE_DIR === "undefined") {
  globalThis.CXXCBC_CACHE_DIR =
    process.env.CN_CXXCBC_CACHE_DIR ||
    path.join(globalThis.CN_ROOT, "deps", "couchbase-cxx-cache");
}

if (typeof globalThis.ENV_TRUE === "undefined") {
  globalThis.ENV_TRUE = ["true", "1", "y", "yes", "on"];
}

const SERVER_PORT = config.application.PORT;
const YOGA_RESPONSE_CACHE_TTL = config.application.YOGA_RESPONSE_CACHE_TTL;

const createEnvelopPlugins = () => [
  useEngine({ parse, validate, specifiedRules, execute, subscribe }),
  usePrometheus({
    requestCount: true,
    requestSummary: true,
    parse: true,
    validate: true,
    contextBuilding: true,
    execute: true,
    errors: true,
    resolvers: true,
    deprecatedFields: true,
  }),
];

const createYogaOptions = () => ({
  typeDefs,
  resolvers,
  batching: {
    limit: 10,
  },
  plugins: [
    useResponseCache({
      session: () => null,
      ttl: YOGA_RESPONSE_CACHE_TTL,
    }),
    {
      onExecute: ({ args }) => {
        log("GraphQL Execute", {
          operation: args.operationName,
          variables: args.variableValues,
        });
      },
      onSubscribe: ({ args }) => {
        log("GraphQL Subscribe", {
          operation: args.operationName,
          variables: args.variableValues,
        });
      },
      onError: ({ error }) => {
        err("GraphQL Error", {
          error: error.message,
          stack: error.stack,
        });
      },
    },
  ],
});

const healthCheck = new Elysia().get("/health", () => "HEALTHY");

const app = new Elysia()
  .onStart(() => log("The server has started!"))
  .use(healthCheck)
  .use(yoga(createYogaOptions()))
  .onRequest((context) => {
    log("Incoming request", {
      method: context.request.method,
      url: context.request.url,
    });
  })
  .onAfterHandle((context) => {
    log("Outgoing response", {
      method: context.request.method,
      url: context.request.url,
      status: context.set.status,
    });
  });

const server = app.listen(SERVER_PORT);

log(`GraphQL server running on port:${SERVER_PORT}`);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close the server
    await server.stop();
    log("Server closed successfully");
    log("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    err("Error during graceful shutdown", error);
    process.exit(1);
  }
};

// Listen for termination signals
["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});
