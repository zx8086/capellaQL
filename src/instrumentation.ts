/* src/instrumentation.ts */

import {
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  metrics,
  type Meter,
} from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

import { MonitoredOTLPTraceExporter } from "./otlp/MonitoredOTLPTraceExporter";
import { MonitoredOTLPMetricExporter } from "./otlp/MonitoredOTLPMetricExporter";
import { MonitoredOTLPLogExporter } from "./otlp/MonitoredOTLPLogExporter";

import type { Counter, Histogram } from "@opentelemetry/api";

import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { GraphQLInstrumentation } from "@opentelemetry/instrumentation-graphql";
import * as api from "@opentelemetry/api-logs";

import config from "./config";

const INSTRUMENTATION_ENABLED =
  (process.env["ENABLE_OPENTELEMETRY"] as string) === "true";
console.log("INSTRUMENTATION_ENABLED:", INSTRUMENTATION_ENABLED);
console.log(
  "process.env.ENABLE_OPENTELEMETRY:",
  process.env["ENABLE_OPENTELEMETRY"] as string,
);

let sdk: NodeSDK | undefined;

// Create a shared resource
const resource = new Resource({
  [ATTR_SERVICE_NAME]: config.openTelemetry.SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: config.openTelemetry.SERVICE_VERSION,
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
    config.openTelemetry.DEPLOYMENT_ENVIRONMENT,
});

const commonConfig = {
  timeoutMillis: 120000, // 2 minutes
  concurrencyLimit: 100,
};

if (INSTRUMENTATION_ENABLED) {
  try {
    console.log("Initializing OpenTelemetry SDK...");

    // Set up diagnostics logging with increased verbosity
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    // Create OTLP exporters with updated configurations
    const traceExporter = new MonitoredOTLPTraceExporter({
      url: config.openTelemetry.TRACES_ENDPOINT,
      headers: { "Content-Type": "application/json" },
      ...commonConfig,
    });

    const otlpMetricExporter = new MonitoredOTLPMetricExporter({
      url: config.openTelemetry.METRICS_ENDPOINT,
      headers: { "Content-Type": "application/json" },
      ...commonConfig,
    });

    const logExporter = new MonitoredOTLPLogExporter({
      url: config.openTelemetry.LOGS_ENDPOINT,
      headers: { "Content-Type": "application/json" },
      ...commonConfig,
    });

    // Set up LoggerProvider
    const loggerProvider = new LoggerProvider({ resource });
    loggerProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(logExporter, {
        maxExportBatchSize: 100,
        scheduledDelayMillis: 10000, // 10 seconds
        exportTimeoutMillis: 60000, // 1 minute
      }),
    );
    api.logs.setGlobalLoggerProvider(loggerProvider);

    const otlpMetricReader = new PeriodicExportingMetricReader({
      exporter: otlpMetricExporter,
      exportIntervalMillis: config.openTelemetry.METRIC_READER_INTERVAL,
    });

    // Set up MeterProvider
    const meterProvider = new MeterProvider({
      resource: resource,
      readers: [otlpMetricReader],
    });

    // Set this MeterProvider to be global to the app being instrumented.
    metrics.setGlobalMeterProvider(meterProvider);

    // // Create a meter
    // meter = metrics.getMeter(
    //   backendConfig.openTelemetry.SERVICE_NAME,
    //   backendConfig.openTelemetry.SERVICE_VERSION,
    // );

    // // Create HTTP request count metric
    // const httpRequestCounter = meter.createCounter('http_requests_total', {
    //   description: 'Count of HTTP requests',
    // });

    // // Create HTTP response time histogram
    // const httpResponseTimeHistogram = meter.createHistogram('http_response_time_seconds', {
    //   description: 'HTTP response time in seconds',
    // });

    // Set this MeterProvider to be global to the app being instrumented.
    // metrics.setGlobalMeterProvider(meterProvider);

    // Create a BatchSpanProcessor with custom configuration
    const batchSpanProcessor = new BatchSpanProcessor(traceExporter, {
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    });

    // Node SDK for OpenTelemetry
    sdk = new NodeSDK({
      resource: resource,
      traceExporter,
      spanProcessors: [batchSpanProcessor],
      logRecordProcessor: new BatchLogRecordProcessor(logExporter),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-aws-lambda": { enabled: false },
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-winston": { enabled: false },
        }),
        new GraphQLInstrumentation({
          allowValues: true,
          depth: -1,
        }),
        new WinstonInstrumentation({
          enabled: true,
          disableLogSending: true,
        }),
      ],
    });

    // Start the SDK
    sdk.start();
    console.log("OpenTelemetry SDK started with auto-instrumentation");

    // Graceful shutdown
    process.on("SIGTERM", () => {
      const shutdownTimeout = setTimeout(() => {
        console.error("SDK shutdown timed out, forcing exit");
        process.exit(1);
      }, 5000);

      sdk
        ?.shutdown()
        .then(() => {
          clearTimeout(shutdownTimeout);
          console.log("SDK shut down successfully");
          process.exit(0);
        })
        .catch((error) => {
          clearTimeout(shutdownTimeout);
          console.error("Error shutting down SDK", error);
          process.exit(1);
        });
    });
  } catch (error) {
    console.error("Error initializing OpenTelemetry SDK:", error);
  }
} else {
  console.log("OpenTelemetry instrumentation is disabled");
}

export const otelSDK = sdk;

export function getMeter(): Meter | undefined {
  if (INSTRUMENTATION_ENABLED) {
    return metrics.getMeter(
      config.openTelemetry.SERVICE_NAME,
      config.openTelemetry.SERVICE_VERSION,
    );
  }
  return undefined;
}

let httpRequestCounter: Counter | undefined;
let httpResponseTimeHistogram: Histogram | undefined;

export function initializeHttpMetrics() {
  if (INSTRUMENTATION_ENABLED) {
    const meter = getMeter();
    if (meter) {
      httpRequestCounter = meter.createCounter('http_requests_total', {
        description: 'Count of HTTP requests',
      });
      httpResponseTimeHistogram = meter.createHistogram('http_response_time_seconds', {
        description: 'HTTP response time in seconds',
      });
    }
  }
}

export function recordHttpRequest(method: string, route: string) {
  httpRequestCounter?.add(1, { method, route });
}

export function recordHttpResponseTime(method: string, route: string, durationMs: number) {
  httpResponseTimeHistogram?.record(durationMs / 1000, { method, route });
}