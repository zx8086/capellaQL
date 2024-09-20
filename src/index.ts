/* src/index.ts */

import { Elysia } from "elysia";
import { log, err } from "$utils/logger";

import config from "./config";
import { cors } from "@elysiajs/cors";
import { yoga } from "@elysiajs/graphql-yoga";
import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  initializeHttpMetrics,
  recordHttpRequest,
  recordHttpResponseTime,
} from "./instrumentation";
import { ulid } from "ulid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Update rate limiting
const RATE_LIMIT = 500; // requests per minute per IP per endpoint
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

function getRateLimitKey(request: Request): string {
  const clientIp = request.headers.get("x-forwarded-for") || 
                   request.headers.get("cf-connecting-ip") || 
                   "unknown";
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  return `${clientIp}:${path}`;
}

function checkRateLimit(request: Request): boolean {
  const userAgent = request.headers.get("user-agent");
  if (userAgent === "K6TestAgent/1.0") {
    return false; // Ignore rate limit for K6 test agent
  }

  const rateLimitKey = getRateLimitKey(request);
  const now = Date.now();
  const clientData = rateLimitStore.get(rateLimitKey) || {
    count: 0,
    timestamp: now,
  };

  if (now - clientData.timestamp > RATE_LIMIT_WINDOW) {
    clientData.count = 1;
    clientData.timestamp = now;
  } else {
    clientData.count++;
  }

  rateLimitStore.set(rateLimitKey, clientData);

  return clientData.count > RATE_LIMIT;
}

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

const healthCheck = new Elysia().get("/health", async () => {
  log("Health check called");

  // Example: Check database connection
  // const isDatabaseConnected = await checkDatabaseConnection();

  // Example: Check external service
  // const isExternalServiceAvailable = await checkExternalService();

  // You can return a more detailed health status if needed
  return {
    status: "HEALTHY",
    // database: isDatabaseConnected ? "Connected" : "Disconnected",
    // externalService: isExternalServiceAvailable ? "Available" : "Unavailable",
  };
});

const getClientIp = (request: Request): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Return the first IP in the list if it's a comma-separated list
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get("cf-connecting-ip") ||
         request.headers.get("x-real-ip") ||
         request.headers.get("x-client-ip") ||
         request.socket?.remoteAddress ||
         "unknown";
};

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
  .onRequest(({ request, set }) => {
    if (checkRateLimit(request)) {
      set.status = 429;
      return "Too Many Requests";
    }
  })
  .onRequest((context) => {
    log("All header context:", Object.fromEntries(context.request.headers.entries()));
    const requestId = ulid();
    context.set.headers["X-Request-ID"] = requestId;

    const clientIp = getClientIp(context.request);

    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${IS_DEVELOPMENT ? "'unsafe-eval'" : ""} https://unpkg.com`,
      `style-src 'self' 'unsafe-inline' https://unpkg.com`,
      "img-src 'self' data: https://raw.githubusercontent.com",
      "font-src 'self' https://unpkg.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "connect-src 'self'",
    ];
    ALLOWED_ORIGINS.forEach((origin) => {
      cspDirectives.forEach((directive, index) => {
        if (!directive.includes("'none'")) {
          cspDirectives[index] += ` ${origin.trim()}`;
        }
      });
    });

    if (IS_DEVELOPMENT) {
      cspDirectives[1] += " 'unsafe-eval'";
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

    log("Incoming request", {
      requestId,
      method,
      url: context.request.url,
      userAgent: context.request.headers.get("user-agent"),
      forwardedFor: context.request.headers.get("x-forwarded-for"),
      clientIp,
      remoteAddress: context.request.ip || "unknown",
    });
  })
  .onAfterHandle((context) => {
    const endTime = Date.now();
    const { startTime } = context.store as { startTime: number };
    const duration = endTime - startTime;
    recordHttpResponseTime(duration);

    log("Outgoing response", {
      requestId: context.set.headers["X-Request-ID"],
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
