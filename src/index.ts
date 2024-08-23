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
  })
  .listen(SERVER_PORT);

log(`GraphQL server running on port:${SERVER_PORT}`);
