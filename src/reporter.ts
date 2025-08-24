import { StressTestResult, TestStats } from "./types";

/**
 * Comprehensive reporting system for stress test results
 * Provides multiple output formats and detailed performance analysis
 */
export class Reporter {
  private static readonly SECTION_SEPARATOR =
    "═══════════════════════════════════════════════════════════════";
  private static readonly SUBSECTION_SEPARATOR =
    "─────────────────────────────────────────────────────────────";

  /**
   * Generates a comprehensive human-readable report
   */
  static generateReport(result: StressTestResult): string {
    const { config, stats, duration, startTime, endTime } = result;

    const sections = [
      this.createHeader(),
      this.createConfigurationSection(config),
      this.createExecutionSection(startTime, endTime, duration),
      this.createPerformanceSection(stats),
      this.createResponseTimeSection(stats),
    ];

    // Add optional sections based on available data
    if (Object.keys(stats.statusCodeDistribution).length > 0) {
      sections.push(this.createStatusCodeSection(stats));
    }

    if (Object.keys(stats.errorDistribution).length > 0) {
      sections.push(this.createErrorSection(stats));
    }

    sections.push(this.createAssessmentSection(stats), this.createFooter());

    return sections.join("\n");
  }

  /**
   * Generates a concise one-line summary
   */
  static generateSummary(result: StressTestResult): string {
    const { stats, duration } = result;

    const summaryItems = [
      `✅ Test completed in ${this.formatDuration(duration)}`,
      `📊 ${stats.totalRequests.toLocaleString()} requests sent`,
      `🎯 ${stats.successRate.toFixed(1)}% success rate`,
      `⚡ ${stats.requestsPerSecond.toFixed(1)} req/s`,
      `📈 ${stats.avgResponseTime.toFixed(0)}ms avg response time`,
    ];

    return summaryItems.join(" | ");
  }

  /**
   * Exports results as formatted JSON
   */
  static exportToJson(result: StressTestResult): string {
    try {
      return JSON.stringify(result, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize results to JSON: ${error}`);
    }
  }

  /**
   * Exports results as CSV format for data analysis
   */
  static exportToCsv(result: StressTestResult): string {
    const headers = [
      "Index",
      "Timestamp",
      "Status Code",
      "Response Time (ms)",
      "Response Size (bytes)",
      "Error",
    ];

    const rows = result.requests.map((req) => [
      req.index.toString(),
      new Date(req.timestamp).toISOString(),
      req.statusCode?.toString() || "",
      req.responseTime.toString(),
      req.responseSize?.toString() || "",
      this.escapeCsvField(req.error || ""),
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ];

    return csvLines.join("\n");
  }

  /**
   * Creates the report header
   */
  private static createHeader(): string {
    return [
      this.SECTION_SEPARATOR,
      "                    STRESS TEST REPORT                        ",
      this.SECTION_SEPARATOR,
      "",
    ].join("\n");
  }

  /**
   * Creates the configuration section
   */
  private static createConfigurationSection(config: any): string {
    const lines = [
      "📊 TEST CONFIGURATION",
      this.SUBSECTION_SEPARATOR,
      `Target URL:           ${config.url}`,
      `HTTP Method:          ${config.method || "GET"}`,
      `Total Requests:       ${config.totalRequests.toLocaleString()}`,
      `Concurrency Level:    ${config.concurrency}`,
      `Attack Pattern:       ${config.pattern || "sustained"}`,
      `Request Timeout:      ${config.timeout || 30000}ms`,
    ];

    if (config.headers && Object.keys(config.headers).length > 0) {
      lines.push(
        `Custom Headers:       ${Object.keys(config.headers).length} header(s)`
      );
    }

    if (config.delay) {
      lines.push(`Request Delay:        ${config.delay}ms`);
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Creates the execution timing section
   */
  private static createExecutionSection(
    startTime: number,
    endTime: number,
    duration: number
  ): string {
    return [
      "⏱️  TEST EXECUTION",
      this.SUBSECTION_SEPARATOR,
      `Start Time:           ${new Date(startTime).toISOString()}`,
      `End Time:             ${new Date(endTime).toISOString()}`,
      `Total Duration:       ${this.formatDuration(duration)}`,
      "",
    ].join("\n");
  }

  /**
   * Creates the performance metrics section
   */
  private static createPerformanceSection(stats: TestStats): string {
    const failureRate = 100 - stats.successRate;

    return [
      "📈 PERFORMANCE METRICS",
      this.SUBSECTION_SEPARATOR,
      `Requests Sent:        ${stats.totalRequests.toLocaleString()}`,
      `Successful Requests:  ${stats.successfulRequests.toLocaleString()} (${stats.successRate.toFixed(
        2
      )}%)`,
      `Failed Requests:      ${stats.failedRequests.toLocaleString()} (${failureRate.toFixed(
        2
      )}%)`,
      `Requests per Second:  ${stats.requestsPerSecond.toFixed(2)} req/s`,
      `Data Transferred:     ${this.formatBytes(stats.totalDataTransferred)}`,
      "",
    ].join("\n");
  }

  /**
   * Creates the response time analysis section
   */
  private static createResponseTimeSection(stats: TestStats): string {
    return [
      "⚡ RESPONSE TIMES",
      this.SUBSECTION_SEPARATOR,
      `Average:              ${stats.avgResponseTime.toFixed(2)}ms`,
      `Minimum:              ${stats.minResponseTime.toFixed(2)}ms`,
      `Maximum:              ${stats.maxResponseTime.toFixed(2)}ms`,
      `50th Percentile:      ${stats.p50ResponseTime.toFixed(2)}ms`,
      `95th Percentile:      ${stats.p95ResponseTime.toFixed(2)}ms`,
      `99th Percentile:      ${stats.p99ResponseTime.toFixed(2)}ms`,
      "",
    ].join("\n");
  }

  /**
   * Creates the status code distribution section
   */
  private static createStatusCodeSection(stats: TestStats): string {
    const lines = ["📊 STATUS CODE DISTRIBUTION", this.SUBSECTION_SEPARATOR];

    const sortedCodes = Object.entries(stats.statusCodeDistribution).sort(
      ([a], [b]) => parseInt(a) - parseInt(b)
    );

    for (const [code, count] of sortedCodes) {
      const percentage = ((count / stats.totalRequests) * 100).toFixed(2);
      const statusText = this.getStatusText(parseInt(code));
      lines.push(
        `${code} ${statusText}: ${count.toLocaleString()} (${percentage}%)`
      );
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Creates the error distribution section
   */
  private static createErrorSection(stats: TestStats): string {
    const lines = ["❌ ERROR DISTRIBUTION", this.SUBSECTION_SEPARATOR];

    const sortedErrors = Object.entries(stats.errorDistribution).sort(
      ([, a], [, b]) => b - a
    );

    for (const [error, count] of sortedErrors) {
      const percentage = ((count / stats.totalRequests) * 100).toFixed(2);
      lines.push(`${error}: ${count.toLocaleString()} (${percentage}%)`);
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Creates the performance assessment section
   */
  private static createAssessmentSection(stats: TestStats): string {
    const assessment = this.generatePerformanceAssessment(stats);

    return [
      "🎯 PERFORMANCE ASSESSMENT",
      this.SUBSECTION_SEPARATOR,
      ...assessment,
      "",
    ].join("\n");
  }

  /**
   * Creates the report footer
   */
  private static createFooter(): string {
    return this.SECTION_SEPARATOR;
  }

  /**
   * Formats duration in human-readable format
   */
  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Formats bytes in human-readable format with appropriate units
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    const base = 1024;
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    const value = bytes / Math.pow(base, unitIndex);

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Maps HTTP status codes to human-readable text
   */
  private static getStatusText(code: number): string {
    const statusMap: Record<number, string> = {
      // 2xx Success
      200: "OK",
      201: "Created",
      202: "Accepted",
      204: "No Content",

      // 3xx Redirection
      301: "Moved Permanently",
      302: "Found",
      304: "Not Modified",

      // 4xx Client Error
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      408: "Request Timeout",
      429: "Too Many Requests",

      // 5xx Server Error
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    return statusMap[code] || "Unknown";
  }

  /**
   * Generates performance assessment based on key metrics
   */
  private static generatePerformanceAssessment(stats: TestStats): string[] {
    const assessments: string[] = [];

    // Success rate assessment
    if (stats.successRate >= 99) {
      assessments.push("🟢 Excellent success rate (≥99%)");
    } else if (stats.successRate >= 95) {
      assessments.push("🟡 Good success rate (95-99%)");
    } else if (stats.successRate >= 90) {
      assessments.push("🟠 Fair success rate (90-95%)");
    } else {
      assessments.push("🔴 Poor success rate (<90%)");
    }

    // Response time assessment
    if (stats.avgResponseTime <= 100) {
      assessments.push("🟢 Excellent response times (≤100ms avg)");
    } else if (stats.avgResponseTime <= 500) {
      assessments.push("🟡 Good response times (100-500ms avg)");
    } else if (stats.avgResponseTime <= 1000) {
      assessments.push("🟠 Fair response times (500-1000ms avg)");
    } else {
      assessments.push("🔴 Poor response times (>1000ms avg)");
    }

    // Throughput assessment
    if (stats.requestsPerSecond >= 1000) {
      assessments.push("🟢 High throughput (≥1000 req/s)");
    } else if (stats.requestsPerSecond >= 100) {
      assessments.push("🟡 Medium throughput (100-1000 req/s)");
    } else if (stats.requestsPerSecond >= 10) {
      assessments.push("🟠 Low throughput (10-100 req/s)");
    } else {
      assessments.push("🔴 Very low throughput (<10 req/s)");
    }

    // Consistency assessment (P95)
    if (stats.p95ResponseTime <= 200) {
      assessments.push("🟢 Consistent performance (P95 ≤200ms)");
    } else if (stats.p95ResponseTime <= 1000) {
      assessments.push("🟡 Mostly consistent performance (P95 200-1000ms)");
    } else {
      assessments.push("🔴 Inconsistent performance (P95 >1000ms)");
    }

    return assessments;
  }

  /**
   * Escapes special characters in CSV fields
   */
  private static escapeCsvField(field: string): string {
    return field.replace(/"/g, '""');
  }
}
