/* src/otlp/MonitoredOTLPLogExporter.ts */

import { MonitoredOTLPExporter } from "./MonitoredOTLPExporter";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import config from "../config";

export class MonitoredOTLPLogExporter extends MonitoredOTLPExporter<
  ReadableLogRecord[]
> {
  protected readonly exporterType: string = "Logs";
  private readonly logExporter: OTLPLogExporter;

  constructor(exporterConfig: OTLPExporterNodeConfigBase) {
    super(exporterConfig, config.openTelemetry.LOGS_ENDPOINT);
    this.logExporter = new OTLPLogExporter(exporterConfig);
  }

  async export(
    logs: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    console.debug("Starting log export");
    this.totalExports++;
    const exportStartTime = Date.now();

    await this.checkNetworkConnectivity();
    this.logSystemResources();

    try {
      await new Promise<void>((resolve, reject) => {
        this.logExporter.export(logs, (result) => {
          if (result.code === ExportResultCode.SUCCESS) {
            this.successfulExports++;
            this.logSuccess(logs.length, Date.now() - exportStartTime);
            resolve();
          } else {
            reject(result.error);
          }
        });
      });
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      this.logDetailedFailure(error, logs.length, Date.now() - exportStartTime);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  async shutdown(): Promise<void> {
    await this.baseShutdown();
    await this.logExporter.shutdown();
  }

  async forceFlush(): Promise<void> {
    console.debug("forceFlush called on MonitoredOTLPLogExporter");
  }
}
