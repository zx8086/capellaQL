/* src/models/types.ts */

export interface ApplicationConfig {
  LOG_LEVEL: string;
  LOG_MAX_SIZE: string;
  LOG_MAX_FILES: string;
  YOGA_RESPONSE_CACHE_TTL: number;
  PORT: number;
}

export interface CapellaConfig {
  COUCHBASE_URL: string;
  COUCHBASE_USERNAME: string;
  COUCHBASE_PASSWORD: string;
  COUCHBASE_BUCKET: string;
  COUCHBASE_SCOPE: string;
  COUCHBASE_COLLECTION: string;
}

export interface OpenTelemetryConfig {
  SERVICE_NAME: string;
  SERVICE_VERSION: string;
  DEPLOYMENT_ENVIRONMENT: string;
  TRACES_ENDPOINT: string;
  METRICS_ENDPOINT: string;
  LOGS_ENDPOINT: string;
  METRIC_READER_INTERVAL: number;
}

export interface Config {
  application: ApplicationConfig;
  capella: CapellaConfig;
  openTelemetry: OpenTelemetryConfig;
}
