/* src/config.ts */

import {
  getEnvOrThrow,
  getEnvNumberOrThrow,
  getEnvBooleanOrThrow,
} from "$utils/getEnv";
import type { Config } from "$models/types";

export const config: Config = {
  application: {
    LOG_LEVEL: getEnvOrThrow("LOG_LEVEL"),
    LOG_MAX_SIZE: getEnvOrThrow("LOG_MAX_SIZE"),
    LOG_MAX_FILES: getEnvOrThrow("LOG_MAX_FILES"),
    YOGA_RESPONSE_CACHE_TTL: getEnvNumberOrThrow("YOGA_RESPONSE_CACHE_TTL"),
    PORT: getEnvNumberOrThrow("PORT"),
    ENABLE_FILE_LOGGING: getEnvBooleanOrThrow("ENABLE_FILE_LOGGING"),
    ALLOWED_ORIGINS: getEnvOrThrow("ALLOWED_ORIGINS").split(","),
  },
  capella: {
    COUCHBASE_URL: getEnvOrThrow("COUCHBASE_URL"),
    COUCHBASE_USERNAME: getEnvOrThrow("COUCHBASE_USERNAME"),
    COUCHBASE_PASSWORD: getEnvOrThrow("COUCHBASE_PASSWORD"),
    COUCHBASE_BUCKET: getEnvOrThrow("COUCHBASE_BUCKET"),
    COUCHBASE_SCOPE: getEnvOrThrow("COUCHBASE_SCOPE"),
    COUCHBASE_COLLECTION: getEnvOrThrow("COUCHBASE_COLLECTION"),
  },
  openTelemetry: {
    ENABLE_OPENTELEMETRY: getEnvBooleanOrThrow("ENABLE_OPENTELEMETRY"),
    SERVICE_NAME: getEnvOrThrow("SERVICE_NAME"),
    SERVICE_VERSION: getEnvOrThrow("SERVICE_VERSION"),
    DEPLOYMENT_ENVIRONMENT: getEnvOrThrow("DEPLOYMENT_ENVIRONMENT"),
    TRACES_ENDPOINT: getEnvOrThrow("TRACES_ENDPOINT"),
    METRICS_ENDPOINT: getEnvOrThrow("METRICS_ENDPOINT"),
    LOGS_ENDPOINT: getEnvOrThrow("LOGS_ENDPOINT"),
    METRIC_READER_INTERVAL: getEnvNumberOrThrow("METRIC_READER_INTERVAL"),
    SUMMARY_LOG_INTERVAL: getEnvNumberOrThrow("SUMMARY_LOG_INTERVAL"),
  },
};

export * from "./models/types";
export default config;
