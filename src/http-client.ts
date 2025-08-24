import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { RequestResult, StressTestConfig, StressTestOptions } from "./types";

/**
 * HTTP client responsible for making concurrent requests with advanced features
 * including response time tracking, error handling, and connection management
 */
export class HttpClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly config: StressTestConfig;
  private readonly options: StressTestOptions;

  constructor(config: StressTestConfig, options: StressTestOptions = {}) {
    this.config = config;
    this.options = options;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Creates and configures the Axios instance with optimized settings
   */
  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      timeout: this.config.timeout || 30000,
      maxRedirects: this.options.maxRedirects || 5,
      headers: {
        "User-Agent": this.options.userAgent || "StressHammer/1.1.0",
        ...this.config.headers,
      },
      validateStatus: () => true, // Accept all status codes for analysis
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  /**
   * Sets up request/response interceptors for timing and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for timing
    this.axiosInstance.interceptors.request.use((config: any) => {
      config.metadata = { startTime: performance.now() };
      return config;
    });

    // Response interceptor for timing calculation
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        const endTime = performance.now();
        const startTime = response.config.metadata?.startTime || endTime;
        response.responseTime = Math.round(endTime - startTime);
        return response;
      },
      (error: any) => {
        const endTime = performance.now();
        const startTime = error.config?.metadata?.startTime || endTime;
        error.responseTime = Math.round(endTime - startTime);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Makes a single HTTP request and returns structured result
   */
  async makeRequest(index: number): Promise<RequestResult> {
    const timestamp = Date.now();

    try {
      const requestConfig: AxiosRequestConfig = {
        method: this.config.method || "GET",
        url: this.config.url,
        data: this.config.body,
      };

      const response: AxiosResponse = await this.axiosInstance.request(
        requestConfig
      );

      return {
        index,
        statusCode: response.status,
        responseTime: response.responseTime || 0,
        responseSize: this.calculateResponseSize(response),
        timestamp,
      };
    } catch (error: any) {
      return {
        index,
        responseTime: error.responseTime || 0,
        error: this.formatError(error),
        timestamp,
      };
    }
  }

  /**
   * Makes concurrent requests with controlled concurrency using semaphore pattern
   */
  async makeConcurrentRequests(
    startIndex: number,
    count: number,
    concurrency: number
  ): Promise<RequestResult[]> {
    const results: RequestResult[] = [];
    const semaphore = new ConcurrencySemaphore(concurrency);

    const requestPromises = Array.from({ length: count }, async (_, i) => {
      await semaphore.acquire();
      try {
        const result = await this.makeRequest(startIndex + i);
        results.push(result);
        return result;
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(requestPromises);
    return results.sort((a, b) => a.index - b.index);
  }

  /**
   * Makes sequential requests with controlled delay between each request
   */
  async makeRequestsWithDelay(
    startIndex: number,
    count: number,
    delay: number
  ): Promise<RequestResult[]> {
    const results: RequestResult[] = [];

    for (let i = 0; i < count; i++) {
      const result = await this.makeRequest(startIndex + i);
      results.push(result);

      if (i < count - 1 && delay > 0) {
        await this.sleep(delay);
      }
    }

    return results;
  }

  /**
   * Calculates the total response size including headers and body
   */
  private calculateResponseSize(response: AxiosResponse): number {
    try {
      const headers = JSON.stringify(response.headers);
      const data =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data);

      return Buffer.byteLength(headers + data, "utf8");
    } catch {
      // Fallback for non-serializable data
      return 0;
    }
  }

  /**
   * Formats error messages in a consistent, readable format
   */
  private formatError(error: any): string {
    if (error.code) {
      const codeMessages: Record<string, string> = {
        ECONNREFUSED: "Connection refused",
        ENOTFOUND: "Host not found",
        ETIMEDOUT: "Request timeout",
        ECONNRESET: "Connection reset",
        ECONNABORTED: "Connection aborted",
      };

      const message = codeMessages[error.code] || error.message;
      return `${error.code}: ${message}`;
    }

    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }

    return error.message || "Unknown network error";
  }

  /**
   * Utility method for creating delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Semaphore implementation for controlling concurrent request execution
 */
class ConcurrencySemaphore {
  private permits: number;
  private readonly waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = Math.max(1, permits); // Ensure at least 1 permit
  }

  /**
   * Acquires a permit, waiting if necessary
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  /**
   * Releases a permit, potentially unblocking waiting requests
   */
  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Extend Axios types for our custom metadata
declare module "axios" {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }

  interface AxiosResponse {
    responseTime?: number;
  }
}
