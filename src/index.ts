/* src/index.ts */

import { Elysia } from "elysia";
import config from "./config";
import { cors } from "@elysiajs/cors";
import { yoga } from "@elysiajs/graphql-yoga";
import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import { log, err } from "$utils/logger";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  initializeHttpMetrics,
  recordHttpRequest,
  recordHttpResponseTime,
} from "./instrumentation";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define types for custom global properties using index signatures
declare global {
  var globalThis: {
    [key: string]: any;
  };
}

if (typeof globalThis["CN_ROOT"] === "undefined") {
  globalThis["CN_ROOT"] =
    process.env["CN_ROOT"] || path.resolve(__dirname, "..");
}

if (typeof globalThis["CN_CXXCBC_CACHE_DIR"] === "undefined") {
  globalThis["CN_CXXCBC_CACHE_DIR"] =
    process.env["CN_CXXCBC_CACHE_DIR"] ||
    path.join(globalThis["CN_ROOT"], "deps", "couchbase-cxx-cache");
}

if (typeof globalThis["ENV_TRUE"] === "undefined") {
  globalThis["ENV_TRUE"] = ["true", "1", "y", "yes", "on"];
}

const SERVER_PORT = config.application["PORT"];
const YOGA_RESPONSE_CACHE_TTL = config.application["YOGA_RESPONSE_CACHE_TTL"];
const ALLOWED_ORIGINS = config.application.ALLOWED_ORIGINS;
const IS_DEVELOPMENT =
  config.openTelemetry.DEPLOYMENT_ENVIRONMENT === "development";

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
          operation: args["operationName"],
          variables: args["variableValues"],
        });
      },
      onSubscribe: ({ args }) => {
        log("GraphQL Subscribe", {
          operation: args["operationName"],
          variables: args["variableValues"],
        });
      },
      onError: ({ error }) => {
        err("GraphQL Error", {
          error: error["message"],
          stack: error["stack"],
        });
      },
    },
  ],
});

const healthCheck = new Elysia().get("/health", () => "HEALTHY");

const app = new Elysia()
  .onStart(() => {
    log("The server has started!");
    initializeHttpMetrics();
  })
  .use(
    cors({
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .use(healthCheck)
  .use(yoga(createYogaOptions()))
  .onRequest((context) => {
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' ${IS_DEVELOPMENT ? "'unsafe-inline'" : ""}`,
      `style-src 'self' ${IS_DEVELOPMENT ? "'unsafe-inline'" : ""}`,
      "img-src 'self' data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "connect-src 'self'",
    ];
    ALLOWED_ORIGINS.forEach((origin) => {
      if (!origin.startsWith("http://localhost:")) {
        cspDirectives.forEach((directive, index) => {
          if (!directive.includes("'none'")) {
            cspDirectives[index] += ` ${origin}`;
          }
        });
      }
    });

    if (IS_DEVELOPMENT) {
      const localhostOrigins = ALLOWED_ORIGINS.filter((origin) =>
        origin.startsWith("http://localhost:"),
      );
      cspDirectives[cspDirectives.length - 1] +=
        ` ${localhostOrigins.join(" ")}`;
    }

    // Set CSP header
    context.set.headers["Content-Security-Policy"] = cspDirectives.join("; ");

    context.set.headers["X-XSS-Protection"] = "1; mode=block";
    context.set.headers["X-Frame-Options"] = "SAMEORIGIN";
    context.set.headers["X-Content-Type-Options"] = "nosniff";
    context.set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    const startTime = Date.now();
    context.store = { startTime };
    const method = context.request.method;
    const url = new URL(context.request.url);
    const route = url.pathname;
    recordHttpRequest(method, route);
    log("Incoming request", { method, url: context.request.url });
  })
  .onAfterHandle((context) => {
    const endTime = Date.now();
    const startTime = (context.store as { startTime: number })?.startTime ?? 0;
    const duration = endTime - startTime;
    recordHttpResponseTime(duration);
    log("Outgoing response", {
      method: context.request.method,
      url: context.request.url,
      status: context.set.status,
      duration: `${duration}ms`,
    });
  });

const server = app.listen(SERVER_PORT);
log(`GraphQL server running on port:${SERVER_PORT}`);

const gracefulShutdown = async (signal: string) => {
  log(`Received ${signal}. Starting graceful shutdown...`);
  try {
    await server.stop();
    log("Server closed successfully");
    log("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    err("Error during graceful shutdown", error);
    process.exit(1);
  }
};

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});
