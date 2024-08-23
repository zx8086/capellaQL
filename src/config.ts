/* src/config.ts */

import { getEnvOrThrow, getEnvNumberOrThrow } from "$utils/getEnv";
import type { Config } from "$models/types";

export const config: Config = {
  application: {
    HEALTH_CHECK_PORT: getEnvNumberOrThrow("HEALTH_CHECK_PORT"),
    HEALTH_CHECK_LOG_INTERVAL: getEnvNumberOrThrow("HEALTH_CHECK_LOG_INTERVAL"),
    HEALTH_CHECK_INTERVAL: getEnvNumberOrThrow("HEALTH_CHECK_INTERVAL"),
    CRON_SCHEDULE: getEnvOrThrow("CRON_SCHEDULE"),
    LOG_LEVEL: getEnvOrThrow("LOG_LEVEL"),
    LOG_MAX_SIZE: getEnvOrThrow("LOG_MAX_SIZE"),
    LOG_MAX_FILES: getEnvOrThrow("LOG_MAX_FILES"),
    YOGA_RESPONSE_CACHE_TTL: getEnvNumberOrThrow("YOGA_RESPONSE_CACHE_TTL"),
    PORT: getEnvNumberOrThrow("PORT"),
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
    SERVICE_NAME: getEnvOrThrow("SERVICE_NAME"),
    SERVICE_VERSION: getEnvOrThrow("SERVICE_VERSION"),
    DEPLOYMENT_ENVIRONMENT: getEnvOrThrow("DEPLOYMENT_ENVIRONMENT"),
    TRACES_ENDPOINT: getEnvOrThrow("TRACES_ENDPOINT"),
    METRICS_ENDPOINT: getEnvOrThrow("METRICS_ENDPOINT"),
    LOGS_ENDPOINT: getEnvOrThrow("LOGS_ENDPOINT"),
    METRIC_READER_INTERVAL: getEnvNumberOrThrow("METRIC_READER_INTERVAL"),
    CONSOLE_METRIC_READER_INTERVAL: getEnvNumberOrThrow(
      "CONSOLE_METRIC_READER_INTERVAL",
    ),
  },
  messaging: {
    ALERT_TYPE: getEnvOrThrow("ALERT_TYPE"),
    SLACK_WEBHOOK_URL: getEnvOrThrow("SLACK_WEBHOOK_URL"),
    TEAMS_WEBHOOK_URL: getEnvOrThrow("TEAMS_WEBHOOK_URL"),
  },
};

export * from "./models/types";
export default config;
