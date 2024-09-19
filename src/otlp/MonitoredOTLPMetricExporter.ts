/* src/otlp/MonitoredOTLPMetricExporter.ts */

import { MonitoredOTLPExporter } from "./MonitoredOTLPExporter";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import type { ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { type ExportResult, ExportResultCode } from "@opentelemetry/core";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import config from "../config";
// import { debug } from "$utils/logger";

export class MonitoredOTLPMetricExporter extends MonitoredOTLPExporter<ResourceMetrics> {
  protected readonly exporterType: string = "Metrics";
  private readonly metricExporter: OTLPMetricExporter;

  constructor(exporterConfig: OTLPExporterNodeConfigBase, timeoutMillis: number = 60000) {
    super(exporterConfig, config.openTelemetry.METRICS_ENDPOINT, timeoutMillis);
    this.metricExporter = new OTLPMetricExporter({
      ...exporterConfig,
      timeoutMillis: this.timeoutMillis
    });
  }

  async export(
    metrics: ResourceMetrics,
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> {
    console.debug("Starting metric export");
    this.totalExports++;
    const exportStartTime = Date.now();

    await this.checkNetworkConnectivity();
    this.logSystemResources();

    try {
      await new Promise<void>((resolve, reject) => {
        this.metricExporter.export(metrics, (result) => {
          if (result.code === ExportResultCode.SUCCESS) {
            this.successfulExports++;
            this.logSuccess(
              metrics.scopeMetrics.length,
              Date.now() - exportStartTime,
            );
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
        metrics.scopeMetrics.length,
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
    await this.metricExporter.shutdown();
  }

  async forceFlush(): Promise<void> {
    await this.metricExporter.forceFlush();
  }
}
