/* src/otlp/MonitoredOTLPTraceExporter.ts */

import { MonitoredOTLPExporter } from "./MonitoredOTLPExporter";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import config from "../config";
// import { debug } from "$utils/logger";

export class MonitoredOTLPTraceExporter extends MonitoredOTLPExporter<
  ReadableSpan[]
> {
  protected readonly exporterType: string = "Traces";
  private readonly traceExporter: OTLPTraceExporter;

  constructor(exporterConfig: OTLPExporterNodeConfigBase) {
    super(exporterConfig, config.openTelemetry.TRACES_ENDPOINT);
    this.traceExporter = new OTLPTraceExporter(exporterConfig);
  }

  async export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    console.debug("Starting trace export");
    this.totalExports++;
    const exportStartTime = Date.now();

    await this.checkNetworkConnectivity();
    this.logSystemResources();

    try {
      await new Promise<void>((resolve, reject) => {
        this.traceExporter.export(spans, (result) => {
          if (result.code === ExportResultCode.SUCCESS) {
            this.successfulExports++;
            this.logSuccess(spans.length, Date.now() - exportStartTime);
            resolve();
          } else {
            reject(result.error);
          }
        });
      });
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      this.logDetailedFailure(
        error,
        spans.length,
        Date.now() - exportStartTime,
      );
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }
  async shutdown(): Promise<void> {
    await this.baseShutdown();
    await this.traceExporter.shutdown();
  }

  async forceFlush(): Promise<void> {
    await this.traceExporter.forceFlush();
  }
}
