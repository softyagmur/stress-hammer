/**
 * Core configuration interface for stress testing
 */
export interface StressTestConfig {
  /** Target URL to test */
  url: string;
  /** HTTP method to use */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST, PUT, PATCH) */
  body?: any;
  /** Number of concurrent requests */
  concurrency: number;
  /** Total number of requests to send */
  totalRequests: number;
  /** Duration of the test in milliseconds (alternative to totalRequests) */
  duration?: number;
  /** Delay between requests in milliseconds */
  delay?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Attack pattern type */
  pattern?: AttackPattern;
  /** Ramp-up configuration for gradual load increase */
  rampUp?: RampUpConfig;
}

/**
 * Configuration for ramp-up attack patterns
 */
export interface RampUpConfig {
  /** Initial concurrency level */
  startConcurrency: number;
  /** Final concurrency level */
  endConcurrency: number;
  /** Duration to reach max concurrency in milliseconds */
  rampUpTime: number;
  /** Step size for increasing concurrency */
  step?: number;
}

/**
 * Available attack patterns for stress testing
 */
export type AttackPattern =
  | "burst"      // All requests sent simultaneously
  | "sustained"  // Steady load over time
  | "ramp-up"    // Gradually increasing load
  | "wave"       // Multiple waves of requests
  | "spike";     // Normal load followed by sudden spike

/**
 * Result of a single HTTP request
 */
export interface RequestResult {
  /** Request index in the test sequence */
  index: number;
  /** HTTP response status code */
  statusCode?: number;
  /** Response time in milliseconds */
  responseTime: number;
  /** Error message if request failed */
  error?: string;
  /** Response size in bytes */
  responseSize?: number;
  /** Timestamp when request was sent */
  timestamp: number;
}

/**
 * Complete stress test result with statistics and metadata
 */
export interface StressTestResult {
  /** Test configuration used */
  config: StressTestConfig;
  /** Individual request results */
  requests: RequestResult[];
  /** Aggregated test statistics */
  stats: TestStats;
  /** Test duration in milliseconds */
  duration: number;
  /** Test start time (Unix timestamp) */
  startTime: number;
  /** Test end time (Unix timestamp) */
  endTime: number;
}

/**
 * Comprehensive test statistics and performance metrics
 */
export interface TestStats {
  /** Total requests sent */
  totalRequests: number;
  /** Successful requests (status < 400) */
  successfulRequests: number;
  /** Failed requests (status >= 400 or error) */
  failedRequests: number;
  /** Success rate percentage (0-100) */
  successRate: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
  /** Minimum response time in milliseconds */
  minResponseTime: number;
  /** Maximum response time in milliseconds */
  maxResponseTime: number;
  /** 50th percentile response time (median) */
  p50ResponseTime: number;
  /** 95th percentile response time */
  p95ResponseTime: number;
  /** 99th percentile response time */
  p99ResponseTime: number;
  /** Requests per second throughput */
  requestsPerSecond: number;
  /** Total data transferred in bytes */
  totalDataTransferred: number;
  /** Error distribution by error type */
  errorDistribution: Record<string, number>;
  /** Status code distribution */
  statusCodeDistribution: Record<number, number>;
}

/**
 * Progress callback function signature
 */
export interface ProgressCallback {
  (progress: ProgressInfo): void;
}

/**
 * Progress information provided to callbacks
 */
export interface ProgressInfo {
  /** Number of completed requests */
  completed: number;
  /** Total number of requests */
  total: number;
  /** Completion percentage (0-100) */
  percentage: number;
  /** Current requests per second */
  currentRps: number;
  /** Average response time of recent requests */
  avgResponseTime: number;
  /** Total number of errors encountered */
  errors: number;
}

/**
 * Log level configuration
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Options for configuring stress test behavior
 */
export interface StressTestOptions {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Log level threshold */
  logLevel?: LogLevel;
  /** Progress callback function */
  onProgress?: ProgressCallback;
  /** Custom user agent string */
  userAgent?: string;
  /** Whether to follow HTTP redirects */
  followRedirects?: boolean;
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
  /** Keep alive connections for better performance */
  keepAlive?: boolean;
}

/**
 * HTTP methods supported by the stress tester
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Common HTTP status code ranges
 */
export const HttpStatusRanges = {
  /** Informational responses (100-199) */
  INFORMATIONAL: { min: 100, max: 199 },
  /** Successful responses (200-299) */
  SUCCESS: { min: 200, max: 299 },
  /** Redirection messages (300-399) */
  REDIRECTION: { min: 300, max: 399 },
  /** Client error responses (400-499) */
  CLIENT_ERROR: { min: 400, max: 499 },
  /** Server error responses (500-599) */
  SERVER_ERROR: { min: 500, max: 599 },
} as const;

/**
 * Utility type for creating partial configurations
 */
export type PartialStressTestConfig = Partial<StressTestConfig> & {
  url: string; // URL is always required
};

/**
 * Configuration for preset attack scenarios
 */
export interface AttackPresetConfig extends PartialStressTestConfig {
  /** Preset name for identification */
  name?: string;
  /** Description of the preset */
  description?: string;
}

/**
 * Error types that can occur during stress testing
 */
export enum StressTestErrorType {
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  EXECUTION_ERROR = "EXECUTION_ERROR",
}

/**
 * Custom error class for stress testing operations
 */
export class StressTestError extends Error {
  constructor(
    message: string,
    public readonly type: StressTestErrorType,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "StressTestError";
  }
}
