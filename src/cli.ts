#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import * as cliProgress from "cli-progress";
import { StressTester } from "./stress-tester";
import { Reporter } from "./reporter";
import { AttackPresets } from "./index";
import { StressTestConfig, StressTestOptions, AttackPattern } from "./types";
import * as fs from "fs";
import * as path from "path";

/**
 * Command-line interface for the Stress Hammer testing tool
 * Provides comprehensive CLI commands for various testing scenarios
 */
class StressHammerCLI {
  private readonly program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
    this.setupErrorHandlers();
  }

  /**
   * Configures all CLI commands and options
   */
  private setupCommands(): void {
    this.program
      .name("stress-hammer")
      .description("A powerful stress testing tool for APIs and web services")
      .version("1.1.0");

    this.setupTestCommand();
    this.setupPresetCommand();
    this.setupConfigCommand();
    this.setupGenerateConfigCommand();
  }

  /**
   * Sets up the main test command
   */
  private setupTestCommand(): void {
    this.program
      .command("test")
      .description("Run a stress test against a target URL")
      .requiredOption("-u, --url <url>", "Target URL to test")
      .option(
        "-m, --method <method>",
        "HTTP method (GET, POST, PUT, DELETE, PATCH)",
        "GET"
      )
      .option(
        "-c, --concurrency <number>",
        "Number of concurrent requests",
        "10"
      )
      .option("-n, --requests <number>", "Total number of requests", "100")
      .option(
        "-d, --duration <seconds>",
        "Test duration in seconds (alternative to --requests)"
      )
      .option(
        "-p, --pattern <pattern>",
        "Attack pattern (burst, sustained, ramp-up, wave, spike)",
        "sustained"
      )
      .option("-t, --timeout <ms>", "Request timeout in milliseconds", "30000")
      .option(
        "-H, --header <header>",
        'Custom headers (format: "Key: Value")',
        this.collectHeaders,
        []
      )
      .option("--body <data>", "Request body (JSON string or file path)")
      .option("--delay <ms>", "Delay between requests in milliseconds", "0")
      .option("-v, --verbose", "Enable verbose logging")
      .option("-o, --output <file>", "Output file for results (JSON format)")
      .option("--csv <file>", "Export results to CSV file")
      .option("--no-progress", "Disable progress bar")
      .action(async (options) => {
        try {
          await this.runStressTest(options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Sets up the preset command for predefined test configurations
   */
  private setupPresetCommand(): void {
    this.program
      .command("preset")
      .description("Run a predefined stress test preset")
      .requiredOption("-u, --url <url>", "Target URL to test")
      .requiredOption(
        "-p, --preset <preset>",
        "Preset name (light, medium, heavy, ddos-burst, ddos-sustained, ramp-up, wave, spike)"
      )
      .option("-v, --verbose", "Enable verbose logging")
      .option("-o, --output <file>", "Output file for results (JSON format)")
      .option("--csv <file>", "Export results to CSV file")
      .option("--no-progress", "Disable progress bar")
      .action(async (options) => {
        try {
          await this.runPresetTest(options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Sets up the config command for file-based configurations
   */
  private setupConfigCommand(): void {
    this.program
      .command("config")
      .description("Run stress test from a configuration file")
      .requiredOption(
        "-f, --file <file>",
        "Configuration file path (JSON format)"
      )
      .option("-v, --verbose", "Enable verbose logging")
      .option("-o, --output <file>", "Output file for results (JSON format)")
      .option("--csv <file>", "Export results to CSV file")
      .option("--no-progress", "Disable progress bar")
      .action(async (options) => {
        try {
          await this.runConfigTest(options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Sets up the generate-config command
   */
  private setupGenerateConfigCommand(): void {
    this.program
      .command("generate-config")
      .description("Generate a sample configuration file")
      .option(
        "-o, --output <file>",
        "Output file path",
        "stress-test-config.json"
      )
      .action((options) => {
        try {
          this.generateSampleConfig(options.output);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Executes a custom stress test based on CLI options
   */
  private async runStressTest(options: any): Promise<void> {
    const config = this.buildConfigFromOptions(options);
    const testOptions = this.buildTestOptions(options);

    await this.executeTest(config, testOptions, options);
  }

  /**
   * Executes a predefined preset test
   */
  private async runPresetTest(options: any): Promise<void> {
    const presetMap = this.getPresetMap();
    const preset = presetMap[options.preset];

    if (!preset) {
      throw new Error(
        `Unknown preset: ${options.preset}. Available presets: ${Object.keys(
          presetMap
        ).join(", ")}`
      );
    }

    const config = preset(options.url);
    const testOptions = this.buildTestOptions(options);

    console.log(chalk.blue(`🚀 Running preset: ${options.preset}`));
    await this.executeTest(config, testOptions, options);
  }

  /**
   * Executes a test from a configuration file
   */
  private async runConfigTest(options: any): Promise<void> {
    const configPath = path.resolve(options.file);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configData = fs.readFileSync(configPath, "utf8");
    let config: StressTestConfig;

    try {
      config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Invalid JSON in configuration file: ${error}`);
    }

    this.validateConfig(config);
    const testOptions = this.buildTestOptions(options);

    console.log(chalk.blue(`📋 Running test from config: ${options.file}`));
    await this.executeTest(config, testOptions, options);
  }

  /**
   * Builds stress test configuration from CLI options
   */
  private buildConfigFromOptions(options: any): StressTestConfig {
    const config: StressTestConfig = {
      url: options.url,
      method: this.validateHttpMethod(options.method.toUpperCase()),
      concurrency: this.parsePositiveInteger(
        options.concurrency,
        "concurrency"
      ),
      totalRequests: this.parsePositiveInteger(options.requests, "requests"),
      pattern: this.validateAttackPattern(options.pattern),
      timeout: this.parsePositiveInteger(options.timeout, "timeout"),
      headers: this.parseHeaders(options.header),
    };

    if (options.duration) {
      config.duration =
        this.parsePositiveInteger(options.duration, "duration") * 1000;
    }

    if (options.delay && parseInt(options.delay) > 0) {
      config.delay = parseInt(options.delay);
    }

    if (options.body) {
      config.body = this.parseBody(options.body);
    }

    return config;
  }

  /**
   * Builds test options from CLI options
   */
  private buildTestOptions(options: any): StressTestOptions {
    return {
      verbose: Boolean(options.verbose),
      logLevel: options.verbose ? "debug" : "info",
    };
  }

  /**
   * Executes the stress test with progress reporting and result handling
   */
  private async executeTest(
    config: StressTestConfig,
    testOptions: StressTestOptions,
    cliOptions: any
  ): Promise<void> {
    const progressBar = this.setupProgressBar(config, testOptions, cliOptions);

    this.displayTestInfo(config);

    const tester = new StressTester(config, testOptions);
    const result = await tester.run();

    if (progressBar) {
      progressBar.stop();
    }

    console.log("");
    console.log(Reporter.generateReport(result));

    await this.handleOutputFiles(result, cliOptions);
    this.handleTestCompletion(result);
  }

  /**
   * Sets up progress bar if enabled
   */
  private setupProgressBar(
    config: StressTestConfig,
    testOptions: StressTestOptions,
    cliOptions: any
  ): cliProgress.SingleBar | null {
    if (cliOptions.progress === false) return null;

    const progressBar = new cliProgress.SingleBar({
      format:
        chalk.cyan("Progress") +
        " |{bar}| {percentage}% | {value}/{total} requests | {rps} req/s | {errors} errors",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
    });

    progressBar.start(config.totalRequests, 0, {
      rps: "0.0",
      errors: "0",
    });

    testOptions.onProgress = (progress) => {
      progressBar.update(progress.completed, {
        rps: progress.currentRps.toFixed(1),
        errors: progress.errors.toString(),
      });
    };

    return progressBar;
  }

  /**
   * Displays test information before execution
   */
  private displayTestInfo(config: StressTestConfig): void {
    console.log(chalk.green("🔨 Starting stress test..."));
    console.log(chalk.gray(`Target: ${config.url}`));
    console.log(chalk.gray(`Pattern: ${config.pattern || "sustained"}`));
    console.log(chalk.gray(`Concurrency: ${config.concurrency}`));
    console.log(chalk.gray(`Total Requests: ${config.totalRequests}`));
    console.log("");
  }

  /**
   * Handles output file generation
   */
  private async handleOutputFiles(result: any, cliOptions: any): Promise<void> {
    if (cliOptions.output) {
      try {
        const jsonOutput = Reporter.exportToJson(result);
        fs.writeFileSync(cliOptions.output, jsonOutput);
        console.log(chalk.green(`📄 Results saved to: ${cliOptions.output}`));
      } catch (error) {
        console.error(chalk.red(`Failed to save JSON output: ${error}`));
      }
    }

    if (cliOptions.csv) {
      try {
        const csvOutput = Reporter.exportToCsv(result);
        fs.writeFileSync(cliOptions.csv, csvOutput);
        console.log(chalk.green(`📊 CSV data exported to: ${cliOptions.csv}`));
      } catch (error) {
        console.error(chalk.red(`Failed to save CSV output: ${error}`));
      }
    }
  }

  /**
   * Handles test completion and exit codes
   */
  private handleTestCompletion(result: any): void {
    if (result.stats.successRate < 50) {
      console.log(chalk.red("⚠️  Test completed with low success rate!"));
      process.exit(1);
    }
  }

  /**
   * Generates a sample configuration file
   */
  private generateSampleConfig(outputPath: string): void {
    const sampleConfig = {
      url: "https://httpbin.org/get",
      method: "GET",
      concurrency: 10,
      totalRequests: 100,
      pattern: "sustained",
      timeout: 30000,
      headers: {
        "User-Agent": "StressHammer/1.1.0",
        Accept: "application/json",
      },
      rampUp: {
        startConcurrency: 5,
        endConcurrency: 50,
        rampUpTime: 30000,
        step: 5,
      },
    };

    try {
      fs.writeFileSync(outputPath, JSON.stringify(sampleConfig, null, 2));
      console.log(
        chalk.green(`📋 Sample configuration generated: ${outputPath}`)
      );
      console.log(
        chalk.gray(
          `Edit the configuration file and run: stress-hammer config -f ${outputPath}`
        )
      );
    } catch (error) {
      throw new Error(`Failed to write configuration file: ${error}`);
    }
  }

  /**
   * Gets the preset mapping
   */
  private getPresetMap(): Record<string, (url: string) => StressTestConfig> {
    return {
      light: AttackPresets.lightLoad,
      medium: AttackPresets.mediumLoad,
      heavy: AttackPresets.heavyLoad,
      "ddos-burst": AttackPresets.ddosBurst,
      "ddos-sustained": AttackPresets.ddosSustained,
      "ramp-up": AttackPresets.rampUpAttack,
      wave: AttackPresets.waveAttack,
      spike: AttackPresets.spikeAttack,
    };
  }

  /**
   * Collects headers from multiple CLI options
   */
  private collectHeaders(value: string, previous: string[]): string[] {
    return previous.concat([value]);
  }

  /**
   * Parses header strings into key-value pairs
   */
  private parseHeaders(headerStrings: string[]): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const headerString of headerStrings) {
      const colonIndex = headerString.indexOf(":");
      if (colonIndex === -1) {
        throw new Error(
          `Invalid header format: ${headerString}. Use "Key: Value" format.`
        );
      }

      const key = headerString.substring(0, colonIndex).trim();
      const value = headerString.substring(colonIndex + 1).trim();

      if (!key || !value) {
        throw new Error(
          `Invalid header format: ${headerString}. Both key and value are required.`
        );
      }

      headers[key] = value;
    }

    return headers;
  }

  /**
   * Parses request body from string or file
   */
  private parseBody(bodyString: string): any {
    // Check if it's a file path
    if (fs.existsSync(bodyString)) {
      try {
        const fileContent = fs.readFileSync(bodyString, "utf8");
        return this.tryParseJson(fileContent);
      } catch (error) {
        throw new Error(`Failed to read body file: ${error}`);
      }
    }

    return this.tryParseJson(bodyString);
  }

  /**
   * Attempts to parse JSON, returns original string if parsing fails
   */
  private tryParseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  /**
   * Validates and parses positive integers
   */
  private parsePositiveInteger(value: string, fieldName: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`${fieldName} must be a positive integer, got: ${value}`);
    }
    return parsed;
  }

  /**
   * Validates HTTP method
   */
  private validateHttpMethod(
    method: string
  ): "GET" | "POST" | "PUT" | "DELETE" | "PATCH" {
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    if (!validMethods.includes(method)) {
      throw new Error(
        `Invalid HTTP method: ${method}. Valid methods: ${validMethods.join(
          ", "
        )}`
      );
    }
    return method as any;
  }

  /**
   * Validates attack pattern
   */
  private validateAttackPattern(pattern: string): AttackPattern {
    const validPatterns: AttackPattern[] = [
      "burst",
      "sustained",
      "ramp-up",
      "wave",
      "spike",
    ];
    if (!validPatterns.includes(pattern as AttackPattern)) {
      throw new Error(
        `Invalid attack pattern: ${pattern}. Valid patterns: ${validPatterns.join(
          ", "
        )}`
      );
    }
    return pattern as AttackPattern;
  }

  /**
   * Validates configuration object
   */
  private validateConfig(config: any): void {
    if (!config.url) {
      throw new Error("Configuration must include a 'url' field");
    }

    if (typeof config.concurrency !== "number" || config.concurrency <= 0) {
      throw new Error("Configuration 'concurrency' must be a positive number");
    }

    if (typeof config.totalRequests !== "number" || config.totalRequests <= 0) {
      throw new Error(
        "Configuration 'totalRequests' must be a positive number"
      );
    }
  }

  /**
   * Sets up global error handlers
   */
  private setupErrorHandlers(): void {
    process.on("uncaughtException", (error) => {
      console.error(chalk.red("Uncaught Exception:"), error.message);
      if (process.env.NODE_ENV === "development") {
        console.error(error.stack);
      }
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      console.error(chalk.red("Unhandled Rejection:"), reason);
      process.exit(1);
    });
  }

  /**
   * Centralized error handling
   */
  private handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red("Error:"), message);

    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(error.stack);
    }

    process.exit(1);
  }

  /**
   * Starts the CLI application
   */
  run(): void {
    this.program.parse();
  }
}

// Initialize and run the CLI
const cli = new StressHammerCLI();
cli.run();
