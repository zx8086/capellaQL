/* src/utils/logger.ts */

import winston from "winston";
import { ecsFormat } from "@elastic/ecs-winston-format";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { config } from "$config";

const rootDir = path.join(__dirname, "..", "..");
const logsDir = path.join(rootDir, "logs");

const customFormat = winston.format.combine(
  ecsFormat({ convertReqRes: true, apmIntegration: true }),
  winston.format((info) => {
    const { '@timestamp': timestamp, 'ecs.version': ecsVersion, level, message, ...rest } = info;
    return { '@timestamp': timestamp, 'ecs.version': ecsVersion, level, log: { level }, message, ...rest };
  })()
);

export const logger = winston.createLogger({
  level: config.application.LOG_LEVEL,
  format: customFormat,
  transports: [
    new winston.transports.Console(),
    new OpenTelemetryTransportV3({
      level: config.application.LOG_LEVEL,
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, "couchbase-capellaQL-service-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: config.application.LOG_MAX_SIZE,
      maxFiles: config.application.LOG_MAX_FILES,
    }),
  ],
});

export function log(message: string, meta?: any): void {
  if (meta) {
    logger.info({ message, meta });
  } else {
    logger.info(message);
  }
}

export function err(message: string, meta?: any): void {
  if (meta) {
    logger.error({ message, meta });
  } else {
    logger.error(message);
  }
}

export function warn(message: string, meta?: any): void {
  if (meta) {
    logger.warn({ message, meta });
  } else {
    logger.warn(message);
  }
}

export function debug(message: string, meta?: any): void {
  if (meta) {
    logger.debug({ message, meta });
  } else {
    logger.debug(message);
  }
}
