/* src/otlp/otlpConfig.ts */

import config from "../config";

export const otlpConfig = {
  logIntervalMs: config.openTelemetry.SUMMARY_LOG_INTERVAL,
};
