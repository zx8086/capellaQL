/* src/otlp/MonitoredOTLPExporter.ts */

import dns from "dns";
import { isIP } from "net";
import os from "os";
import { otlpConfig } from "./otlpConfig";
import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import type { ExportResult } from "@opentelemetry/core";
import config from "../config";

export abstract class MonitoredOTLPExporter<T> {
  private logTimer: any;
  protected totalExports: number = 0;
  protected successfulExports: number = 0;
  protected readonly logIntervalMs: number;
  public readonly url: string;
  protected abstract readonly exporterType: string;

  constructor(exporterConfig: OTLPExporterNodeConfigBase, endpoint: string) {
    this.url = exporterConfig.url || endpoint;
    console.log(`${this.constructor.name} initialized with URL: ${this.url}`);

    this.logIntervalMs = otlpConfig.logIntervalMs;
    if (typeof this.logIntervalMs !== "number" || isNaN(this.logIntervalMs)) {
      console.warn(
        `Invalid logIntervalMs: ${this.logIntervalMs}. Using default of 300000ms.`,
      );
      this.logIntervalMs = config.openTelemetry.SUMMARY_LOG_INTERVAL;
    } else {
      console.log(
        `${this.constructor.name} log interval: ${this.logIntervalMs}ms`,
      );
    }

    this.logTimer = setInterval(() => {
      this.logStatistics();
    }, this.logIntervalMs);
  }

  private logStatistics(): void {
    const successRate = (this.successfulExports / this.totalExports) * 100 || 0;
    console.debug(`
=== OpenTelemetry ${this.exporterType} Export Statistics ===
Total Exports: ${this.totalExports}
Successful Exports: ${this.successfulExports}
Success Rate: ${successRate.toFixed(2)}%
===============================================
    `);
  }

  protected async checkNetworkConnectivity(): Promise<void> {
    const url = new URL(this.url);
    const host = url.hostname;

    console.debug(`Checking network connectivity to ${host}`);

    if (!isIP(host)) {
      try {
        const addresses = await dns.promises.resolve4(host);
        console.debug(`DNS resolution for ${host}: ${addresses.join(", ")}`);
      } catch (error) {
        console.error(`DNS resolution failed for ${host}:`, error);
      }
    }
  }

  protected logSystemResources(): void {
    const cpuUsage = os.loadavg()[0];
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    const processMemory = process.memoryUsage();
    const processCpuUsage = process.cpuUsage();

    console.debug(`System CPU Usage (1m average): ${cpuUsage.toFixed(2)}`);
    console.debug(`System Memory Usage: ${memoryUsage.toFixed(2)}%`);
    console.debug(
      `Total System Memory: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
    console.debug(
      `Free System Memory: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
    console.debug(
      `Process RSS: ${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`,
    );
    console.debug(
      `Process Heap Total: ${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    );
    console.debug(
      `Process Heap Used: ${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.debug(
      `Process CPU User: ${(processCpuUsage.user / 1000000).toFixed(2)} seconds`,
    );
    console.debug(
      `Process CPU System: ${(processCpuUsage.system / 1000000).toFixed(2)} seconds`,
    );
  }

  protected logSuccess(itemCount: number, duration: number): void {
    const itemType = this.getItemType(itemCount);
    console.debug(
      `Successfully exported ${itemCount} ${itemType} in ${duration}ms`,
    );
  }

  private getItemType(count: number): string {
    const singularType = this.exporterType.toLowerCase().slice(0, -1);
    return count === 1 ? singularType : this.exporterType.toLowerCase();
  }

  protected logDetailedFailure(
    error: unknown,
    itemCount: number,
    duration: number,
  ): void {
    console.error(`Failed to export ${itemCount} items after ${duration}ms:`);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    } else {
      console.error(`Unexpected error type:`, error);
    }
    console.error(
      `Current memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
    );
    console.error(`Current time: ${new Date().toISOString()}`);
  }

  protected async baseShutdown(): Promise<void> {
    clearInterval(this.logTimer as NodeJS.Timeout);
  }

  abstract shutdown(): Promise<void>;

  abstract forceFlush(): Promise<void>;

  abstract export(
    items: T,
    resultCallback: (result: ExportResult) => void,
  ): Promise<void>;
}
