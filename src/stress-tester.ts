import { HttpClient } from "./http-client";
import {
  StressTestConfig,
  StressTestOptions,
  StressTestResult,
  RequestResult,
  TestStats,
  AttackPattern,
} from "./types";

/**
 * Core stress testing engine that orchestrates different attack patterns
 * and manages the execution lifecycle of stress tests
 */
export class StressTester {
  private readonly config: StressTestConfig;
  private readonly options: StressTestOptions;
  private readonly httpClient: HttpClient;
  private results: RequestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config: StressTestConfig, options: StressTestOptions = {}) {
    this.validateConfig(config);
    this.config = config;
    this.options = options;
    this.httpClient = new HttpClient(config, options);
  }

  /**
   * Executes the stress test according to the configured pattern
   */
  async run(): Promise<StressTestResult> {
    this.logInfo(`Starting stress test with ${this.config.totalRequests} requests`);
    this.logInfo(`Target: ${this.config.url}`);
    this.logInfo(`Concurrency: ${this.config.concurrency}`);
    this.logInfo(`Pattern: ${this.config.pattern || "sustained"}`);

    this.initializeTest();

    try {
      await this.executePattern();
    } catch (error) {
      this.logError(`Test failed: ${error}`);
      throw error;
    }

    return this.finalizeTest();
  }

  /**
   * Initializes test state and metrics
   */
  private initializeTest(): void {
    this.startTime = Date.now();
    this.results = [];
  }

  /**
   * Executes the appropriate attack pattern based on configuration
   */
  private async executePattern(): Promise<void> {
    const pattern = this.config.pattern || "sustained";
    
    switch (pattern) {
      case "burst":
        await this.executeBurstPattern();
        break;
      case "ramp-up":
        await this.executeRampUpPattern();
        break;
      case "wave":
        await this.executeWavePattern();
        break;
      case "spike":
        await this.executeSpikePattern();
        break;
      case "sustained":
      default:
        await this.executeSustainedPattern();
        break;
    }
  }

  /**
   * Finalizes test execution and returns comprehensive results
   */
  private finalizeTest(): StressTestResult {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;

    this.logInfo(`Test completed in ${duration}ms`);

    return {
      config: this.config,
      requests: this.results,
      stats: this.calculateStats(),
      duration,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * Executes sustained pattern with controlled batching
   */
  private async executeSustainedPattern(): Promise<void> {
    const batchSize = Math.min(this.config.concurrency, this.config.totalRequests);
    const batches = Math.ceil(this.config.totalRequests / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const startIndex = batch * batchSize;
      const requestsInBatch = Math.min(
        batchSize,
        this.config.totalRequests - startIndex
      );

      const batchResults = await this.httpClient.makeConcurrentRequests(
        startIndex,
        requestsInBatch,
        this.config.concurrency
      );

      this.results.push(...batchResults);
      this.reportProgress();

      // Apply inter-batch delay if configured
      if (this.config.delay && batch < batches - 1) {
        await this.sleep(this.config.delay);
      }
    }
  }

  /**
   * Executes burst pattern - all requests sent simultaneously
   */
  private async executeBurstPattern(): Promise<void> {
    this.logInfo("Executing burst pattern - sending all requests simultaneously");

    const results = await this.httpClient.makeConcurrentRequests(
      0,
      this.config.totalRequests,
      this.config.concurrency
    );

    this.results.push(...results);
    this.reportProgress();
  }

  /**
   * Executes ramp-up pattern with gradually increasing concurrency
   */
  private async executeRampUpPattern(): Promise<void> {
    const rampUpConfig = this.config.rampUp;
    if (!rampUpConfig) {
      throw new Error("Ramp-up configuration is required for ramp-up pattern");
    }

    const {
      startConcurrency,
      endConcurrency,
      rampUpTime,
      step = 1,
    } = rampUpConfig;

    this.validateRampUpConfig(rampUpConfig);

    const stepDuration = rampUpTime / Math.ceil((endConcurrency - startConcurrency) / step);
    let currentConcurrency = startConcurrency;
    let requestIndex = 0;

    this.logInfo(
      `Ramping up from ${startConcurrency} to ${endConcurrency} over ${rampUpTime}ms`
    );

    while (
      currentConcurrency <= endConcurrency &&
      requestIndex < this.config.totalRequests
    ) {
      const requestsToSend = Math.min(
        currentConcurrency,
        this.config.totalRequests - requestIndex
      );

      const batchResults = await this.httpClient.makeConcurrentRequests(
        requestIndex,
        requestsToSend,
        currentConcurrency
      );

      this.results.push(...batchResults);
      requestIndex += requestsToSend;
      this.reportProgress();

      if (currentConcurrency < endConcurrency) {
        currentConcurrency = Math.min(currentConcurrency + step, endConcurrency);
        await this.sleep(stepDuration);
      }
    }
  }

  /**
   * Executes wave pattern with multiple distinct waves of requests
   */
  private async executeWavePattern(): Promise<void> {
    const waveCount = 3;
    const requestsPerWave = Math.floor(this.config.totalRequests / waveCount);
    const waveDuration = 2000; // 2 seconds between waves

    this.logInfo(`Executing wave pattern with ${waveCount} waves`);

    for (let wave = 0; wave < waveCount; wave++) {
      const startIndex = wave * requestsPerWave;
      const requestsInWave = wave === waveCount - 1
        ? this.config.totalRequests - startIndex
        : requestsPerWave;

      this.logInfo(`Starting wave ${wave + 1}/${waveCount}`);

      const waveResults = await this.httpClient.makeConcurrentRequests(
        startIndex,
        requestsInWave,
        this.config.concurrency
      );

      this.results.push(...waveResults);
      this.reportProgress();

      if (wave < waveCount - 1) {
        await this.sleep(waveDuration);
      }
    }
  }

  /**
   * Executes spike pattern with normal load followed by sudden spike
   */
  private async executeSpikePattern(): Promise<void> {
    const spikeRequests = Math.floor(this.config.totalRequests * 0.8);
    const normalRequests = this.config.totalRequests - spikeRequests;

    this.logInfo("Executing spike pattern - normal load followed by spike");

    // Normal load phase
    if (normalRequests > 0) {
      const normalResults = await this.httpClient.makeConcurrentRequests(
        0,
        normalRequests,
        Math.floor(this.config.concurrency * 0.3)
      );
      this.results.push(...normalResults);
      this.reportProgress();
    }

    await this.sleep(1000); // Brief pause before spike

    // Spike phase
    this.logInfo("Starting spike phase");
    const spikeResults = await this.httpClient.makeConcurrentRequests(
      normalRequests,
      spikeRequests,
      this.config.concurrency
    );

    this.results.push(...spikeResults);
    this.reportProgress();
  }

  /**
   * Calculates comprehensive test statistics
   */
  private calculateStats(): TestStats {
    const successfulRequests = this.results.filter(
      (r) => r.statusCode && r.statusCode < 400
    );
    const failedRequests = this.results.filter(
      (r) => !r.statusCode || r.statusCode >= 400 || r.error
    );

    const responseTimes = this.results
      .filter((r) => r.responseTime > 0)
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);

    const totalDataTransferred = this.results.reduce(
      (sum, r) => sum + (r.responseSize || 0),
      0
    );

    const duration = this.endTime - this.startTime;
    const requestsPerSecond = duration > 0 ? (this.results.length / duration) * 1000 : 0;

    return {
      totalRequests: this.results.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: this.results.length > 0 
        ? (successfulRequests.length / this.results.length) * 100 
        : 0,
      avgResponseTime: this.calculateAverage(responseTimes),
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p50ResponseTime: this.calculatePercentile(responseTimes, 50),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      requestsPerSecond,
      totalDataTransferred,
      errorDistribution: this.calculateErrorDistribution(failedRequests),
      statusCodeDistribution: this.calculateStatusCodeDistribution(),
    };
  }

  /**
   * Calculates the specified percentile from sorted response times
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Calculates average from an array of numbers
   */
  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0 
      ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length 
      : 0;
  }

  /**
   * Calculates error distribution from failed requests
   */
  private calculateErrorDistribution(failedRequests: RequestResult[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    failedRequests.forEach((r) => {
      const error = r.error || "Unknown error";
      distribution[error] = (distribution[error] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculates status code distribution from all requests
   */
  private calculateStatusCodeDistribution(): Record<number, number> {
    const distribution: Record<number, number> = {};
    
    this.results.forEach((r) => {
      if (r.statusCode) {
        distribution[r.statusCode] = (distribution[r.statusCode] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Reports progress to configured callback if available
   */
  private reportProgress(): void {
    if (!this.options.onProgress) return;

    const completed = this.results.length;
    const total = this.config.totalRequests;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    const recentResults = this.results.slice(-100);
    const currentRps = recentResults.length > 0 && this.startTime > 0
      ? recentResults.length / ((Date.now() - this.startTime) / 1000)
      : 0;

    const avgResponseTime = recentResults.length > 0
      ? recentResults.reduce((sum, r) => sum + r.responseTime, 0) / recentResults.length
      : 0;

    const errors = this.results.filter(
      (r) => r.error || (r.statusCode && r.statusCode >= 400)
    ).length;

    this.options.onProgress({
      completed,
      total,
      percentage,
      currentRps,
      avgResponseTime,
      errors,
    });
  }

  /**
   * Validates the stress test configuration
   */
  private validateConfig(config: StressTestConfig): void {
    if (!config.url) {
      throw new Error("URL is required");
    }

    if (config.concurrency <= 0) {
      throw new Error("Concurrency must be greater than 0");
    }

    if (config.totalRequests <= 0) {
      throw new Error("Total requests must be greater than 0");
    }

    if (config.timeout && config.timeout <= 0) {
      throw new Error("Timeout must be greater than 0");
    }
  }

  /**
   * Validates ramp-up configuration
   */
  private validateRampUpConfig(rampUp: NonNullable<StressTestConfig['rampUp']>): void {
    if (rampUp.startConcurrency <= 0 || rampUp.endConcurrency <= 0) {
      throw new Error("Ramp-up concurrency values must be greater than 0");
    }

    if (rampUp.startConcurrency >= rampUp.endConcurrency) {
      throw new Error("End concurrency must be greater than start concurrency");
    }

    if (rampUp.rampUpTime <= 0) {
      throw new Error("Ramp-up time must be greater than 0");
    }
  }

  /**
   * Logs informational messages
   */
  private logInfo(message: string): void {
    this.log("info", message);
  }

  /**
   * Logs error messages
   */
  private logError(message: string): void {
    this.log("error", message);
  }

  /**
   * Centralized logging with level filtering
   */
  private log(level: "debug" | "info" | "warn" | "error", message: string): void {
    if (!this.options.verbose && level === "debug") return;

    const logLevel = this.options.logLevel || "info";
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };

    if (levels[level] >= levels[logLevel]) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Utility method for creating delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
