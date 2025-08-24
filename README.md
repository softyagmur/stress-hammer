# 🔨 Stress Hammer

A powerful TypeScript library for performing heavy stress tests and load testing on APIs and web services. Perfect for testing your application's resilience under extreme load conditions.

[![npm version](https://badge.fury.io/js/stress-hammer.svg)](https://badge.fury.io/js/stress-hammer)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **Multiple Attack Patterns**: Burst, sustained, ramp-up, wave, and spike patterns
- **High Concurrency**: Support for thousands of concurrent requests
- **Detailed Metrics**: Comprehensive performance statistics and percentile analysis
- **CLI Interface**: Easy-to-use command-line tool
- **Flexible Configuration**: JSON config files and programmatic API
- **Export Options**: JSON and CSV export for results
- **Progress Tracking**: Real-time progress bars and logging
- **TypeScript Support**: Full TypeScript support with type definitions

## 📦 Installation

```bash
npm install -g stress-hammer
```

Or for programmatic use:

```bash
npm install stress-hammer
```

## 🎯 Quick Start

### CLI Usage

```bash
# Basic stress test
stress-hammer test -u https://api.example.com -c 50 -n 1000

# DDoS simulation
stress-hammer preset -u https://api.example.com -p ddos-burst

# Custom configuration
stress-hammer config -f my-test-config.json
```

### Programmatic Usage

```typescript
import { stressTest, AttackPresets, StressTester } from 'stress-hammer';

// Quick test
const result = await stressTest('https://api.example.com', {
  concurrency: 50,
  totalRequests: 1000,
  pattern: 'sustained'
});

// Using presets
const config = AttackPresets.ddosBurst('https://api.example.com');
const tester = new StressTester(config);
const result = await tester.run();

console.log(`Success rate: ${result.stats.successRate}%`);
console.log(`Average response time: ${result.stats.avgResponseTime}ms`);
```

## 🎮 CLI Commands

### Basic Test Command

```bash
stress-hammer test [options]
```

**Options:**
- `-u, --url <url>` - Target URL (required)
- `-m, --method <method>` - HTTP method (GET, POST, PUT, DELETE, PATCH)
- `-c, --concurrency <number>` - Concurrent requests (default: 10)
- `-n, --requests <number>` - Total requests (default: 100)
- `-p, --pattern <pattern>` - Attack pattern (burst, sustained, ramp-up, wave, spike)
- `-t, --timeout <ms>` - Request timeout in milliseconds
- `-H, --header <header>` - Custom headers (format: "Key: Value")
- `--body <data>` - Request body (JSON string or file path)
- `--delay <ms>` - Delay between requests
- `-v, --verbose` - Enable verbose logging
- `-o, --output <file>` - Save results to JSON file
- `--csv <file>` - Export results to CSV file

**Examples:**

```bash
# GET request with 100 concurrent connections
stress-hammer test -u https://api.example.com -c 100 -n 5000

# POST request with custom headers and body
stress-hammer test -u https://api.example.com/users \
  -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token123" \
  --body '{"name":"test","email":"test@example.com"}' \
  -c 50 -n 1000

# Ramp-up pattern test
stress-hammer test -u https://api.example.com -p ramp-up -c 200 -n 2000

# Save results to files
stress-hammer test -u https://api.example.com -c 50 -n 1000 \
  -o results.json --csv results.csv
```

### Preset Commands

```bash
stress-hammer preset -u <url> -p <preset>
```

**Available Presets:**
- `light` - Light load testing (5 concurrent, 50 requests)
- `medium` - Medium load testing (20 concurrent, 500 requests)
- `heavy` - Heavy load testing (100 concurrent, 2000 requests)
- `ddos-burst` - DDoS burst attack (500 concurrent, 5000 requests)
- `ddos-sustained` - DDoS sustained attack (200 concurrent, 10000 requests)
- `ramp-up` - Gradual ramp-up attack
- `wave` - Wave pattern attack
- `spike` - Spike pattern attack

**Examples:**

```bash
# Light load test
stress-hammer preset -u https://api.example.com -p light

# DDoS simulation
stress-hammer preset -u https://api.example.com -p ddos-burst -v
```

### Configuration File

```bash
stress-hammer config -f config.json
```

Generate a sample configuration:

```bash
stress-hammer generate-config -o my-config.json
```

**Sample Configuration:**

```json
{
  "url": "https://api.example.com",
  "method": "GET",
  "concurrency": 100,
  "totalRequests": 2000,
  "pattern": "sustained",
  "timeout": 30000,
  "headers": {
    "User-Agent": "StressHammer/1.0.0",
    "Accept": "application/json"
  },
  "rampUp": {
    "startConcurrency": 10,
    "endConcurrency": 100,
    "rampUpTime": 30000,
    "step": 10
  }
}
```

## 🔧 Programmatic API

### StressTester Class

```typescript
import { StressTester, StressTestConfig } from 'stress-hammer';

const config: StressTestConfig = {
  url: 'https://api.example.com',
  method: 'GET',
  concurrency: 50,
  totalRequests: 1000,
  pattern: 'sustained',
  timeout: 30000
};

const tester = new StressTester(config, {
  verbose: true,
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  }
});

const result = await tester.run();
```

### Attack Patterns

#### Sustained Pattern
Maintains consistent load throughout the test:

```typescript
const config = {
  url: 'https://api.example.com',
  concurrency: 50,
  totalRequests: 1000,
  pattern: 'sustained'
};
```

#### Burst Pattern
Sends all requests simultaneously:

```typescript
const config = {
  url: 'https://api.example.com',
  concurrency: 500,
  totalRequests: 5000,
  pattern: 'burst'
};
```

#### Ramp-up Pattern
Gradually increases load:

```typescript
const config = {
  url: 'https://api.example.com',
  concurrency: 100,
  totalRequests: 2000,
  pattern: 'ramp-up',
  rampUp: {
    startConcurrency: 10,
    endConcurrency: 100,
    rampUpTime: 30000,
    step: 10
  }
};
```

#### Wave Pattern
Creates waves of traffic:

```typescript
const config = {
  url: 'https://api.example.com',
  concurrency: 150,
  totalRequests: 3000,
  pattern: 'wave'
};
```

#### Spike Pattern
Normal load followed by a sudden spike:

```typescript
const config = {
  url: 'https://api.example.com',
  concurrency: 300,
  totalRequests: 2000,
  pattern: 'spike'
};
```

### Using Presets

```typescript
import { AttackPresets, StressTester } from 'stress-hammer';

// Use a preset
const config = AttackPresets.heavyLoad('https://api.example.com');
const tester = new StressTester(config);
const result = await tester.run();

// Customize a preset
const customConfig = {
  ...AttackPresets.ddosBurst('https://api.example.com'),
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token123' }
};
```

### Progress Tracking

```typescript
const tester = new StressTester(config, {
  onProgress: (progress) => {
    console.log(`
      Completed: ${progress.completed}/${progress.total}
      Progress: ${progress.percentage.toFixed(1)}%
      Current RPS: ${progress.currentRps.toFixed(1)}
      Avg Response Time: ${progress.avgResponseTime.toFixed(1)}ms
      Errors: ${progress.errors}
    `);
  }
});
```

## 📊 Results and Reporting

### Test Results Structure

```typescript
interface StressTestResult {
  config: StressTestConfig;
  requests: RequestResult[];
  stats: TestStats;
  duration: number;
  startTime: number;
  endTime: number;
}

interface TestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  totalDataTransferred: number;
  errorDistribution: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
}
```

### Generating Reports

```typescript
import { Reporter } from 'stress-hammer';

// Generate detailed report
const report = Reporter.generateReport(result);
console.log(report);

// Generate summary
const summary = Reporter.generateSummary(result);
console.log(summary);

// Export to JSON
const jsonData = Reporter.exportToJson(result);

// Export to CSV
const csvData = Reporter.exportToCsv(result);
```

### Sample Report Output

```
═══════════════════════════════════════════════════════════════
                    STRESS TEST REPORT
═══════════════════════════════════════════════════════════════

📊 TEST CONFIGURATION
─────────────────────────────────────────────────────────────
Target URL:           https://api.example.com
HTTP Method:          GET
Total Requests:       1,000
Concurrency Level:    50
Attack Pattern:       sustained
Request Timeout:      30000ms

⏱️  TEST EXECUTION
─────────────────────────────────────────────────────────────
Start Time:           2024-01-15T10:30:00.000Z
End Time:             2024-01-15T10:32:15.500Z
Total Duration:       2m 15s

📈 PERFORMANCE METRICS
─────────────────────────────────────────────────────────────
Requests Sent:        1,000
Successful Requests:  985 (98.50%)
Failed Requests:      15 (1.50%)
Requests per Second:  7.41 req/s
Data Transferred:     2.5 MB

⚡ RESPONSE TIMES
─────────────────────────────────────────────────────────────
Average:              125.50ms
Minimum:              45.20ms
Maximum:              2,150.30ms
50th Percentile:      110.20ms
95th Percentile:      280.50ms
99th Percentile:      450.80ms

🎯 PERFORMANCE ASSESSMENT
─────────────────────────────────────────────────────────────
🟢 Excellent success rate (≥99%)
🟡 Good response times (100-500ms avg)
🔴 Very low throughput (<10 req/s)
🟢 Consistent performance (P95 ≤200ms)
```

## 🛠️ Advanced Usage

### Sequential Tests

```typescript
import { Utils } from 'stress-hammer';

const configs = [
  AttackPresets.lightLoad('https://api.example.com'),
  AttackPresets.mediumLoad('https://api.example.com'),
  AttackPresets.heavyLoad('https://api.example.com')
];

const results = await Utils.runSequentialTests(configs, {
  verbose: true,
  delayBetweenTests: 5000 // 5 second delay between tests
});

// Generate comparison report
const comparisonReport = Utils.generateComparisonReport(results);
console.log(comparisonReport);
```

### Custom HTTP Client

```typescript
import { HttpClient } from 'stress-hammer';

const client = new HttpClient(config, {
  userAgent: 'MyCustomAgent/1.0',
  followRedirects: true,
  maxRedirects: 10,
  keepAlive: true
});

const results = await client.makeConcurrentRequests(0, 100, 10);
```

## ⚠️ Important Notes

### Ethical Usage
- **Only test your own services** or services you have explicit permission to test
- **Respect rate limits** and terms of service
- **Use responsibly** - this tool can generate significant load
- **Monitor your tests** to avoid overwhelming target services

### Performance Considerations
- High concurrency tests require sufficient system resources
- Monitor memory usage during large tests
- Consider network bandwidth limitations
- Use appropriate timeouts to prevent hanging requests

### Legal Disclaimer
This tool is intended for legitimate load testing and performance evaluation purposes only. Users are responsible for ensuring they have proper authorization before testing any systems. Unauthorized stress testing may violate terms of service or applicable laws.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/stress-hammer)
- [NPM Package](https://www.npmjs.com/package/stress-hammer)
- [Documentation](https://github.com/yourusername/stress-hammer/wiki)
- [Issues](https://github.com/yourusername/stress-hammer/issues)

## 📈 Changelog

### v1.0.0
- Initial release
- Multiple attack patterns support
- CLI interface
- Comprehensive reporting
- TypeScript support
- Export functionality

---

**Made with ❤️ for performance testing**
