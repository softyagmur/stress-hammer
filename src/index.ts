import { StressTester } from "./stress-tester";
import {
  StressTestConfig,
  StressTestOptions,
  AttackPresetConfig,
} from "./types";

// Re-export all core components for external use
export { StressTester } from "./stress-tester";
export { HttpClient } from "./http-client";
export { Reporter } from "./reporter";
export * from "./types";

/**
 * Convenience function for quick stress testing with minimal configuration
 *
 * @param url - Target URL to test
 * @param options - Test configuration options
 * @returns Promise resolving to test results
 *
 * @example
 * ```typescript
 * const result = await stressTest('https://api.example.com', {
 *   concurrency: 10,
 *   totalRequests: 100,
 *   pattern: 'sustained'
 * });
 * ```
 */
export async function stressTest(
  url: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    body?: any;
    concurrency?: number;
    totalRequests?: number;
    duration?: number;
    pattern?: "burst" | "sustained" | "ramp-up" | "wave" | "spike";
    timeout?: number;
    verbose?: boolean;
  } = {}
) {
  const config: StressTestConfig = {
    url,
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
    concurrency: options.concurrency || 10,
    totalRequests: options.totalRequests || 100,
    duration: options.duration,
    timeout: options.timeout || 30000,
    pattern: options.pattern || "sustained",
  };

  const testOptions: StressTestOptions = {
    verbose: options.verbose || false,
  };

  const tester = new StressTester(config, testOptions);
  return await tester.run();
}

/**
 * Predefined attack configurations for common testing scenarios
 * Each preset is optimized for specific use cases and load levels
 */
export const AttackPresets = {
  /**
   * Light load testing - suitable for development and basic validation
   */
  lightLoad: (url: string): StressTestConfig => ({
    url,
    concurrency: 5,
    totalRequests: 50,
    pattern: "sustained",
    timeout: 30000,
  }),

  /**
   * Medium load testing - suitable for staging environment testing
   */
  mediumLoad: (url: string): StressTestConfig => ({
    url,
    concurrency: 20,
    totalRequests: 500,
    pattern: "sustained",
    timeout: 30000,
  }),

  /**
   * Heavy load testing - suitable for production capacity testing
   */
  heavyLoad: (url: string): StressTestConfig => ({
    url,
    concurrency: 100,
    totalRequests: 2000,
    pattern: "sustained",
    timeout: 30000,
  }),

  /**
   * DDoS simulation - burst attack pattern
   * Sends all requests simultaneously to test burst capacity
   */
  ddosBurst: (url: string): StressTestConfig => ({
    url,
    concurrency: 500,
    totalRequests: 5000,
    pattern: "burst",
    timeout: 5000,
  }),

  /**
   * DDoS simulation - sustained attack pattern
   * Maintains high load over extended period
   */
  ddosSustained: (url: string): StressTestConfig => ({
    url,
    concurrency: 200,
    totalRequests: 10000,
    pattern: "sustained",
    timeout: 10000,
  }),

  /**
   * Ramp-up attack - gradually increases load
   * Useful for testing auto-scaling behavior
   */
  rampUpAttack: (url: string): StressTestConfig => ({
    url,
    concurrency: 100,
    totalRequests: 1000,
    pattern: "ramp-up",
    timeout: 30000,
    rampUp: {
      startConcurrency: 10,
      endConcurrency: 100,
      rampUpTime: 30000, // 30 seconds
      step: 10,
    },
  }),

  /**
   * Wave attack pattern - multiple distinct waves
   * Simulates periodic traffic spikes
   */
  waveAttack: (url: string): StressTestConfig => ({
    url,
    concurrency: 150,
    totalRequests: 3000,
    pattern: "wave",
    timeout: 30000,
  }),

  /**
   * Spike attack pattern - sudden traffic spike
   * Tests system response to unexpected load increases
   */
  spikeAttack: (url: string): StressTestConfig => ({
    url,
    concurrency: 300,
    totalRequests: 2000,
    pattern: "spike",
    timeout: 30000,
  }),

  /**
   * API endpoint testing - optimized for REST API testing
   */
  apiEndpointTest: (
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET"
  ): StressTestConfig => ({
    url,
    method,
    concurrency: 50,
    totalRequests: 1000,
    pattern: "sustained",
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "StressHammer/1.1.0",
    },
  }),

  /**
   * Database stress test - simulates database-heavy operations
   * Includes delays to simulate realistic database query times
   */
  databaseStress: (url: string): StressTestConfig => ({
    url,
    concurrency: 75,
    totalRequests: 1500,
    pattern: "sustained",
    timeout: 60000, // Longer timeout for database operations
    delay: 100, // Small delay to simulate realistic usage
  }),

  /**
   * Microservice testing - optimized for microservice architectures
   */
  microserviceTest: (url: string): StressTestConfig => ({
    url,
    concurrency: 30,
    totalRequests: 600,
    pattern: "sustained",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  }),

  /**
   * CDN testing - tests content delivery network performance
   */
  cdnTest: (url: string): StressTestConfig => ({
    url,
    concurrency: 200,
    totalRequests: 5000,
    pattern: "burst",
    timeout: 10000,
    headers: {
      "Cache-Control": "no-cache",
    },
  }),
} as const;

/**
 * Utility functions for advanced stress testing scenarios
 */
export const StressTestUtils = {
  /**
   * Creates a custom configuration by merging base config with overrides
   */
  createConfig: (
    baseConfig: Partial<StressTestConfig>,
    overrides: Partial<StressTestConfig> = {}
  ): StressTestConfig => {
    if (!baseConfig.url && !overrides.url) {
      throw new Error("URL is required in base config or overrides");
    }

    return {
      concurrency: 10,
      totalRequests: 100,
      timeout: 30000,
      pattern: "sustained",
      ...baseConfig,
      ...overrides,
      url: overrides.url || baseConfig.url!,
      headers: {
        ...baseConfig.headers,
        ...overrides.headers,
      },
    };
  },

  /**
   * Runs multiple stress tests in sequence with optional delays
   */
  runSequentialTests: async (
    configs: StressTestConfig[],
    options: StressTestOptions & { delayBetweenTests?: number } = {}
  ) => {
    const results = [];
    const { delayBetweenTests, ...testOptions } = options;

    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      console.log(
        `\n🚀 Starting test ${i + 1}/${configs.length}: ${config.url}`
      );

      const tester = new StressTester(config, testOptions);
      const result = await tester.run();
      results.push(result);

      // Add delay between tests if specified
      if (delayBetweenTests && i < configs.length - 1) {
        console.log(`⏳ Waiting ${delayBetweenTests}ms before next test...`);
        await new Promise((resolve) => setTimeout(resolve, delayBetweenTests));
      }
    }

    return results;
  },

  /**
   * Runs multiple stress tests in parallel (use with caution)
   */
  runParallelTests: async (
    configs: StressTestConfig[],
    options: StressTestOptions = {}
  ) => {
    console.log(`🚀 Starting ${configs.length} parallel tests...`);

    const testPromises = configs.map((config, index) => {
      console.log(`Starting parallel test ${index + 1}: ${config.url}`);
      const tester = new StressTester(config, options);
      return tester.run();
    });

    return await Promise.all(testPromises);
  },

  /**
   * Generates a comprehensive comparison report for multiple test results
   */
  generateComparisonReport: (results: any[]) => {
    const sections = [
      "═══════════════════════════════════════════════════════════════",
      "                    COMPARISON REPORT                         ",
      "═══════════════════════════════════════════════════════════════",
      "",
    ];

    results.forEach((result, index) => {
      const config = result.config;
      const stats = result.stats;

      sections.push(`📊 Test ${index + 1}: ${config.url}`);
      sections.push(
        `   Method: ${config.method || "GET"} | Pattern: ${
          config.pattern || "sustained"
        }`
      );
      sections.push(`   Success Rate: ${stats.successRate.toFixed(2)}%`);
      sections.push(`   Avg Response: ${stats.avgResponseTime.toFixed(2)}ms`);
      sections.push(`   Requests/sec: ${stats.requestsPerSecond.toFixed(2)}`);
      sections.push(`   P95 Response: ${stats.p95ResponseTime.toFixed(2)}ms`);
      sections.push(
        `   Total Requests: ${stats.totalRequests.toLocaleString()}`
      );
      sections.push("");
    });

    // Add summary statistics
    if (results.length > 1) {
      const avgSuccessRate =
        results.reduce((sum, r) => sum + r.stats.successRate, 0) /
        results.length;
      const avgResponseTime =
        results.reduce((sum, r) => sum + r.stats.avgResponseTime, 0) /
        results.length;
      const totalRequests = results.reduce(
        (sum, r) => sum + r.stats.totalRequests,
        0
      );

      sections.push("📈 SUMMARY STATISTICS");
      sections.push(
        "─────────────────────────────────────────────────────────────"
      );
      sections.push(`Average Success Rate: ${avgSuccessRate.toFixed(2)}%`);
      sections.push(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      sections.push(
        `Total Requests Across All Tests: ${totalRequests.toLocaleString()}`
      );
      sections.push("");
    }

    sections.push(
      "═══════════════════════════════════════════════════════════════"
    );

    return sections.join("\n");
  },

  /**
   * Validates a stress test configuration
   */
  validateConfig: (config: Partial<StressTestConfig>): string[] => {
    const errors: string[] = [];

    if (!config.url) {
      errors.push("URL is required");
    } else {
      try {
        new URL(config.url);
      } catch {
        errors.push("URL must be a valid URL");
      }
    }

    if (config.concurrency !== undefined && config.concurrency <= 0) {
      errors.push("Concurrency must be greater than 0");
    }

    if (config.totalRequests !== undefined && config.totalRequests <= 0) {
      errors.push("Total requests must be greater than 0");
    }

    if (config.timeout !== undefined && config.timeout <= 0) {
      errors.push("Timeout must be greater than 0");
    }

    if (config.delay !== undefined && config.delay < 0) {
      errors.push("Delay cannot be negative");
    }

    return errors;
  },

  /**
   * Creates a configuration for testing multiple endpoints
   */
  createMultiEndpointConfig: (
    baseUrl: string,
    endpoints: string[],
    baseConfig: Partial<StressTestConfig> = {}
  ): StressTestConfig[] => {
    return endpoints.map((endpoint) => ({
      concurrency: 10,
      totalRequests: 100,
      timeout: 30000,
      pattern: "sustained" as const,
      ...baseConfig,
      url: `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`,
    }));
  },
};
