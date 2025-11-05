// api-testing.ts
// ============================================
// 🧪 API Testing System
// نظام اختبار API المتقدم
// ============================================

import { OqoolAPIClient } from './api-client.js';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface APIEndpoint {
  name: string;
  method: HTTPMethod;
  url: string;
  description?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, any>;
  body?: any;
  auth?: AuthConfig;
  timeout?: number;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
}

export interface APITestCase {
  id: string;
  name: string;
  endpoint: APIEndpoint;
  expectedStatus: number;
  expectedHeaders?: Record<string, string>;
  expectedBody?: any;
  assertions?: Assertion[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface Assertion {
  type: 'status' | 'header' | 'body' | 'json' | 'schema' | 'performance' | 'custom';
  field?: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte' | 'exists' | 'type';
  expected: any;
  actual?: any;
  passed?: boolean;
  message?: string;
}

export interface APITestResult {
  testCase: string;
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  assertions: Assertion[];
  error?: string;
  timestamp: number;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  baseURL?: string;
  globalHeaders?: Record<string, string>;
  globalAuth?: AuthConfig;
  testCases: APITestCase[];
  hooks?: {
    beforeAll?: () => Promise<void>;
    afterAll?: () => Promise<void>;
    beforeEach?: () => Promise<void>;
    afterEach?: () => Promise<void>;
  };
}

export interface TestSuiteResult {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: APITestResult[];
  coverage?: number;
}

export interface LoadTestConfig {
  endpoint: APIEndpoint;
  duration: number; // seconds
  concurrency: number;
  rampUp?: number; // seconds
  thinkTime?: number; // milliseconds
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  errors: Record<string, number>;
}

// ============================================
// API Testing System
// ============================================

export class APITesting {
  private projectRoot: string;
  private client: OqoolAPIClient;
  private testsDir: string;
  private resultsDir: string;
  private testSuites: Map<string, TestSuite> = new Map();

  constructor(projectRoot: string, client: OqoolAPIClient) {
    this.projectRoot = projectRoot;
    this.client = client;
    this.testsDir = path.join(projectRoot, 'api-tests');
    this.resultsDir = path.join(projectRoot, 'test-results');
  }

  // ============================================
  // Test Suite Management
  // ============================================

  /**
   * إنشاء test suite جديد
   */
  async createTestSuite(name: string, description?: string, baseURL?: string): Promise<TestSuite> {
    const suite: TestSuite = {
      id: `suite-${Date.now()}`,
      name,
      description,
      baseURL,
      testCases: [],
    };

    this.testSuites.set(suite.id, suite);

    console.log(chalk.green(`✅ تم إنشاء Test Suite: ${name}`));
    return suite;
  }

  /**
   * إضافة test case للـ suite
   */
  async addTestCase(suiteId: string, testCase: Omit<APITestCase, 'id'>): Promise<void> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`);
    }

    const fullTestCase: APITestCase = {
      ...testCase,
      id: `test-${Date.now()}`,
    };

    suite.testCases.push(fullTestCase);

    console.log(chalk.green(`✅ تم إضافة Test Case: ${testCase.name}`));
  }

  /**
   * توليد test suite من مجموعة endpoints
   */
  async generateTestSuiteFromEndpoints(
    endpoints: APIEndpoint[],
    suiteName: string
  ): Promise<TestSuite> {
    const suite = await this.createTestSuite(suiteName);

    for (const endpoint of endpoints) {
      const testCases = await this.generateTestCasesForEndpoint(endpoint);
      for (const testCase of testCases) {
        await this.addTestCase(suite.id, testCase);
      }
    }

    return suite;
  }

  /**
   * توليد test cases لـ endpoint معين
   */
  async generateTestCasesForEndpoint(endpoint: APIEndpoint): Promise<Omit<APITestCase, 'id'>[]> {
    const testCases: Omit<APITestCase, 'id'>[] = [];

    // Test Case 1: Success scenario
    testCases.push({
      name: `${endpoint.name} - Success`,
      endpoint,
      expectedStatus: 200,
      assertions: [
        {
          type: 'status',
          operator: 'equals',
          expected: 200,
        },
        {
          type: 'performance',
          operator: 'lt',
          expected: 1000,
          field: 'responseTime',
        },
      ],
    });

    // Test Case 2: Invalid input (for POST/PUT/PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      testCases.push({
        name: `${endpoint.name} - Invalid Input`,
        endpoint: {
          ...endpoint,
          body: {}, // Empty body
        },
        expectedStatus: 400,
        assertions: [
          {
            type: 'status',
            operator: 'equals',
            expected: 400,
          },
        ],
      });
    }

    // Test Case 3: Unauthorized (if auth required)
    if (endpoint.auth && endpoint.auth.type !== 'none') {
      testCases.push({
        name: `${endpoint.name} - Unauthorized`,
        endpoint: {
          ...endpoint,
          auth: { type: 'none' },
        },
        expectedStatus: 401,
        assertions: [
          {
            type: 'status',
            operator: 'equals',
            expected: 401,
          },
        ],
      });
    }

    // Test Case 4: Not Found (for GET/DELETE with invalid ID)
    if (['GET', 'DELETE'].includes(endpoint.method)) {
      testCases.push({
        name: `${endpoint.name} - Not Found`,
        endpoint: {
          ...endpoint,
          url: endpoint.url.replace(/\/\d+$/, '/99999999'),
        },
        expectedStatus: 404,
        assertions: [
          {
            type: 'status',
            operator: 'equals',
            expected: 404,
          },
        ],
      });
    }

    return testCases;
  }

  // ============================================
  // Test Execution
  // ============================================

  /**
   * تشغيل test suite
   */
  async runTestSuite(suiteId: string): Promise<TestSuiteResult> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`);
    }

    console.log(chalk.cyan(`\n🧪 Running Test Suite: ${suite.name}\n`));

    const startTime = Date.now();
    const results: APITestResult[] = [];

    // beforeAll hook
    if (suite.hooks?.beforeAll) {
      await suite.hooks.beforeAll();
    }

    for (const testCase of suite.testCases) {
      // beforeEach hook
      if (suite.hooks?.beforeEach) {
        await suite.hooks.beforeEach();
      }

      // Run test
      const result = await this.runTestCase(testCase, suite.baseURL);
      results.push(result);

      // Print result
      this.printTestResult(result);

      // afterEach hook
      if (suite.hooks?.afterEach) {
        await suite.hooks.afterEach();
      }
    }

    // afterAll hook
    if (suite.hooks?.afterAll) {
      await suite.hooks.afterAll();
    }

    const duration = Date.now() - startTime;
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const suiteResult: TestSuiteResult = {
      suite: suite.name,
      total: results.length,
      passed,
      failed,
      skipped: 0,
      duration,
      results,
    };

    // Print summary
    this.printTestSuiteSummary(suiteResult);

    // Save results
    await this.saveTestResults(suiteResult);

    return suiteResult;
  }

  /**
   * تشغيل test case واحد
   */
  async runTestCase(testCase: APITestCase, baseURL?: string): Promise<APITestResult> {
    const startTime = Date.now();

    try {
      // Setup
      if (testCase.setup) {
        await testCase.setup();
      }

      // Prepare request
      const url = baseURL ? `${baseURL}${testCase.endpoint.url}` : testCase.endpoint.url;

      const headers = {
        'Content-Type': 'application/json',
        ...testCase.endpoint.headers,
      };

      // Add auth header
      if (testCase.endpoint.auth) {
        this.addAuthHeader(headers, testCase.endpoint.auth);
      }

      // Make request
      const response = await this.makeRequest(testCase.endpoint.method, url, {
        headers,
        body: testCase.endpoint.body,
        queryParams: testCase.endpoint.queryParams,
        timeout: testCase.endpoint.timeout,
      });

      const responseTime = Date.now() - startTime;

      // Run assertions
      const assertions = testCase.assertions || [];
      for (const assertion of assertions) {
        this.runAssertion(assertion, response, responseTime);
      }

      // Teardown
      if (testCase.teardown) {
        await testCase.teardown();
      }

      const allPassed = assertions.every((a) => a.passed);

      return {
        testCase: testCase.name,
        success: allPassed,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        responseTime,
        assertions,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      return {
        testCase: testCase.name,
        success: false,
        status: 0,
        statusText: 'Error',
        headers: {},
        body: null,
        responseTime: Date.now() - startTime,
        assertions: [],
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * تنفيذ assertion
   */
  private runAssertion(assertion: Assertion, response: any, responseTime: number): void {
    let actual: any;
    let passed = false;

    switch (assertion.type) {
      case 'status':
        actual = response.status;
        break;

      case 'header':
        actual = assertion.field ? response.headers[assertion.field] : null;
        break;

      case 'body':
      case 'json':
        actual = assertion.field
          ? this.getNestedValue(response.body, assertion.field)
          : response.body;
        break;

      case 'performance':
        actual = responseTime;
        break;

      case 'schema':
        // JSON Schema validation
        passed = this.validateSchema(response.body, assertion.expected);
        assertion.passed = passed;
        return;
    }

    // Evaluate operator
    switch (assertion.operator) {
      case 'equals':
        passed = actual === assertion.expected;
        break;

      case 'contains':
        passed = actual && actual.includes && actual.includes(assertion.expected);
        break;

      case 'matches':
        passed = actual && new RegExp(assertion.expected).test(actual);
        break;

      case 'gt':
        passed = actual > assertion.expected;
        break;

      case 'lt':
        passed = actual < assertion.expected;
        break;

      case 'gte':
        passed = actual >= assertion.expected;
        break;

      case 'lte':
        passed = actual <= assertion.expected;
        break;

      case 'exists':
        passed = actual !== undefined && actual !== null;
        break;

      case 'type':
        passed = typeof actual === assertion.expected;
        break;
    }

    assertion.actual = actual;
    assertion.passed = passed;
    assertion.message = passed
      ? `✓ ${assertion.type} ${assertion.operator} ${assertion.expected}`
      : `✗ Expected ${assertion.type} to ${assertion.operator} ${assertion.expected}, got ${actual}`;
  }

  // ============================================
  // Load Testing
  // ============================================

  /**
   * تشغيل load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    console.log(chalk.cyan(`\n⚡ Running Load Test...\n`));
    console.log(chalk.white(`Duration: ${config.duration}s`));
    console.log(chalk.white(`Concurrency: ${config.concurrency}`));
    console.log(chalk.white(`Endpoint: ${config.endpoint.method} ${config.endpoint.url}\n`));

    const startTime = Date.now();
    const endTime = startTime + config.duration * 1000;
    const responseTimes: number[] = [];
    const errors: Record<string, number> = {};

    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    // Worker function
    const worker = async (): Promise<void> => {
      while (Date.now() < endTime) {
        const reqStart = Date.now();

        try {
          await this.makeRequest(config.endpoint.method, config.endpoint.url, {
            headers: config.endpoint.headers,
            body: config.endpoint.body,
            timeout: config.endpoint.timeout,
          });

          const reqTime = Date.now() - reqStart;
          responseTimes.push(reqTime);
          successfulRequests++;
        } catch (error: any) {
          failedRequests++;
          const errorKey = error.message || 'Unknown error';
          errors[errorKey] = (errors[errorKey] || 0) + 1;
        }

        totalRequests++;

        // Think time
        if (config.thinkTime) {
          await this.sleep(config.thinkTime);
        }
      }
    };

    // Start workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < config.concurrency; i++) {
      // Ramp up delay
      if (config.rampUp) {
        await this.sleep((config.rampUp * 1000) / config.concurrency);
      }
      workers.push(worker());
    }

    // Wait for all workers
    await Promise.all(workers);

    const duration = (Date.now() - startTime) / 1000;

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);

    const result: LoadTestResult = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: this.average(responseTimes),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      requestsPerSecond: totalRequests / duration,
      percentiles: {
        p50: this.percentile(responseTimes, 50),
        p90: this.percentile(responseTimes, 90),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99),
      },
      errors,
    };

    this.printLoadTestResult(result);

    return result;
  }

  // ============================================
  // AI-Powered Features
  // ============================================

  /**
   * توليد test suite تلقائياً من OpenAPI/Swagger spec
   */
  async generateTestSuiteFromOpenAPI(specPath: string, suiteName: string): Promise<TestSuite> {
    const spec = JSON.parse(await fs.readFile(specPath, 'utf-8'));
    const endpoints: APIEndpoint[] = [];

    // Parse paths
    for (const [path, methods] of Object.entries(spec.paths || {})) {
      for (const [method, details] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          endpoints.push({
            name: (details as any).summary || `${method.toUpperCase()} ${path}`,
            method: method.toUpperCase() as HTTPMethod,
            url: path,
            description: (details as any).description,
          });
        }
      }
    }

    return this.generateTestSuiteFromEndpoints(endpoints, suiteName);
  }

  /**
   * توليد assertions ذكية باستخدام AI
   */
  async generateSmartAssertions(endpoint: APIEndpoint, sampleResponse?: any): Promise<Assertion[]> {
    const prompt = `
أنشئ assertions ذكية لاختبار API endpoint:

Method: ${endpoint.method}
URL: ${endpoint.url}
Description: ${endpoint.description || 'N/A'}

${sampleResponse ? `Sample Response:\n${JSON.stringify(sampleResponse, null, 2)}` : ''}

أنشئ assertions للتحقق من:
1. Status code
2. Response headers
3. Response body structure
4. Data types
5. Required fields
6. Business logic validation
7. Performance (response time)

التنسيق (JSON Array):
[
  {
    "type": "status|header|body|json|performance",
    "field": "field_path",
    "operator": "equals|contains|gt|lt|exists|type",
    "expected": value
  }
]
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      return [];
    }

    const jsonMatch = response.message.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      return [];
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * اقتراح تحسينات للـ tests
   */
  async suggestTestImprovements(suiteResult: TestSuiteResult): Promise<string[]> {
    const failedTests = suiteResult.results.filter((r) => !r.success);

    const prompt = `
حلل نتائج الاختبارات التالية واقترح تحسينات:

Total Tests: ${suiteResult.total}
Passed: ${suiteResult.passed}
Failed: ${suiteResult.failed}
Duration: ${suiteResult.duration}ms

Failed Tests:
${failedTests.map((t) => `- ${t.testCase}: ${t.error || 'Assertions failed'}`).join('\n')}

اقترح:
1. تحسينات للـ tests الفاشلة
2. assertions إضافية
3. edge cases مهمة
4. تحسينات للأداء
5. best practices

أعط 5-10 اقتراحات عملية.
`;

    const response = await this.client.sendChatMessage([{ role: 'user', content: prompt }]);

    if (!response.success) {
      return [];
    }

    return response.message
      .split('\n')
      .filter((line) => line.trim().match(/^\d+\.|^-/))
      .map((line) => line.replace(/^\d+\.\s*|-\s*/, '').trim());
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * إجراء HTTP request
   */
  private async makeRequest(
    method: HTTPMethod,
    url: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      queryParams?: Record<string, any>;
      timeout?: number;
    } = {}
  ): Promise<any> {
    // هنا يجب استخدام مكتبة HTTP مثل axios أو node-fetch
    // هذا مثال بسيط
    const fullUrl = this.buildURL(url, options.queryParams);

    // Simulate HTTP request (في الواقع، استخدم axios أو fetch)
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      body: {},
    };
  }

  /**
   * إضافة auth header
   */
  private addAuthHeader(headers: Record<string, string>, auth: AuthConfig): void {
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;

      case 'basic':
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;

      case 'apikey':
        const headerName = auth.apiKeyHeader || 'X-API-Key';
        headers[headerName] = auth.apiKey || '';
        break;
    }
  }

  /**
   * بناء URL مع query parameters
   */
  private buildURL(url: string, params?: Record<string, any>): string {
    if (!params) return url;

    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * الحصول على قيمة متداخلة من object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * التحقق من JSON Schema
   */
  private validateSchema(data: any, schema: any): boolean {
    // يحتاج مكتبة مثل ajv للـ JSON Schema validation
    // هذا مثال بسيط
    return true;
  }

  /**
   * حساب المتوسط
   */
  private average(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  /**
   * حساب percentile
   */
  private percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0;
    const index = Math.ceil((p / 100) * numbers.length) - 1;
    return numbers[index];
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * طباعة نتيجة test
   */
  private printTestResult(result: APITestResult): void {
    const icon = result.success ? chalk.green('✓') : chalk.red('✗');
    const time = chalk.gray(`(${result.responseTime}ms)`);

    console.log(`${icon} ${result.testCase} ${time}`);

    if (!result.success && result.assertions) {
      result.assertions
        .filter((a) => !a.passed)
        .forEach((a) => {
          console.log(chalk.red(`   ${a.message}`));
        });
    }
  }

  /**
   * طباعة ملخص test suite
   */
  private printTestSuiteSummary(result: TestSuiteResult): void {
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('Test Suite Summary'));
    console.log(chalk.cyan('='.repeat(60)));

    console.log(chalk.white(`Total:    ${result.total}`));
    console.log(chalk.green(`Passed:   ${result.passed}`));
    console.log(chalk.red(`Failed:   ${result.failed}`));
    console.log(chalk.gray(`Duration: ${result.duration}ms`));

    const coverage = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : '0';
    console.log(chalk.cyan(`Coverage: ${coverage}%`));

    console.log(chalk.cyan('='.repeat(60) + '\n'));
  }

  /**
   * طباعة نتائج load test
   */
  private printLoadTestResult(result: LoadTestResult): void {
    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('Load Test Results'));
    console.log(chalk.cyan('='.repeat(60)));

    console.log(chalk.white(`Total Requests:      ${result.totalRequests}`));
    console.log(chalk.green(`Successful:          ${result.successfulRequests}`));
    console.log(chalk.red(`Failed:              ${result.failedRequests}`));
    console.log(chalk.cyan(`Requests/sec:        ${result.requestsPerSecond.toFixed(2)}`));
    console.log(chalk.white(`\nResponse Times (ms):`));
    console.log(chalk.white(`  Average:           ${result.averageResponseTime.toFixed(2)}`));
    console.log(chalk.white(`  Min:               ${result.minResponseTime}`));
    console.log(chalk.white(`  Max:               ${result.maxResponseTime}`));
    console.log(chalk.white(`  50th percentile:   ${result.percentiles.p50}`));
    console.log(chalk.white(`  90th percentile:   ${result.percentiles.p90}`));
    console.log(chalk.white(`  95th percentile:   ${result.percentiles.p95}`));
    console.log(chalk.white(`  99th percentile:   ${result.percentiles.p99}`));

    if (Object.keys(result.errors).length > 0) {
      console.log(chalk.red(`\nErrors:`));
      for (const [error, count] of Object.entries(result.errors)) {
        console.log(chalk.red(`  ${error}: ${count}`));
      }
    }

    console.log(chalk.cyan('='.repeat(60) + '\n'));
  }

  /**
   * حفظ نتائج الاختبارات
   */
  private async saveTestResults(result: TestSuiteResult): Promise<void> {
    await fs.mkdir(this.resultsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const fileName = `${result.suite}-${timestamp}.json`;
    const filePath = path.join(this.resultsDir, fileName);

    await fs.writeFile(filePath, JSON.stringify(result, null, 2));

    console.log(chalk.gray(`\n📊 Results saved to: ${filePath}\n`));
  }

  /**
   * تصدير نتائج كـ HTML report
   */
  async exportHTMLReport(result: TestSuiteResult, outputPath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>API Test Report - ${result.suite}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .passed { color: green; }
    .failed { color: red; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
    th { background: #333; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>API Test Report: ${result.suite}</h1>

  <div class="summary">
    <h2>Summary</h2>
    <p>Total Tests: ${result.total}</p>
    <p class="passed">Passed: ${result.passed}</p>
    <p class="failed">Failed: ${result.failed}</p>
    <p>Duration: ${result.duration}ms</p>
    <p>Coverage: ${((result.passed / result.total) * 100).toFixed(1)}%</p>
  </div>

  <h2>Test Results</h2>
  <table>
    <thead>
      <tr>
        <th>Test Case</th>
        <th>Status</th>
        <th>Response Time</th>
        <th>HTTP Status</th>
      </tr>
    </thead>
    <tbody>
      ${result.results
        .map(
          (r) => `
        <tr>
          <td>${r.testCase}</td>
          <td class="${r.success ? 'passed' : 'failed'}">${r.success ? 'PASS' : 'FAIL'}</td>
          <td>${r.responseTime}ms</td>
          <td>${r.status}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>
`;

    await fs.writeFile(outputPath, html);
    console.log(chalk.green(`✅ HTML Report exported to: ${outputPath}`));
  }
}

// ============================================
// Factory Function
// ============================================

export function createAPITesting(projectRoot: string, client: OqoolAPIClient): APITesting {
  return new APITesting(projectRoot, client);
}
