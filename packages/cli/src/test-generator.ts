import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeAnalyzer, FunctionInfo, ClassInfo } from './code-analyzer.js';
import { OqoolAPIClient } from './api-client.js';

/**
 * إطار عمل الاختبارات المدعوم
 */
export type TestFramework = 'jest' | 'mocha' | 'vitest' | 'ava';

/**
 * نوع الاختبار
 */
export type TestType = 'unit' | 'integration' | 'e2e';

/**
 * خيارات توليد الاختبارات
 */
export interface TestOptions {
  /** إطار العمل */
  framework?: TestFramework;
  /** نوع الاختبار */
  type?: TestType;
  /** استخدام AI لتوليد حالات اختبار ذكية */
  useAI?: boolean;
  /** توليد mocks */
  generateMocks?: boolean;
  /** تغطية الـ edge cases */
  includeEdgeCases?: boolean;
  /** المجلد الناتج */
  outputDir?: string;
  /** اللغة */
  language?: 'ar' | 'en';
}

/**
 * معلومات حالة اختبار
 */
export interface TestCase {
  name: string;
  description: string;
  input: any;
  expected: any;
  type: 'normal' | 'edge' | 'error';
}

/**
 * معلومات اختبار دالة
 */
export interface FunctionTest {
  functionName: string;
  testCases: TestCase[];
  mocks?: MockDefinition[];
  setup?: string;
  teardown?: string;
}

/**
 * تعريف Mock
 */
export interface MockDefinition {
  name: string;
  type: string;
  implementation: string;
}

/**
 * معلومات اختبار كلاس
 */
export interface ClassTest {
  className: string;
  methods: FunctionTest[];
  beforeEach?: string;
  afterEach?: string;
}

/**
 * نتيجة توليد الاختبارات
 */
export interface TestGenerationResult {
  success: boolean;
  testsGenerated: number;
  files: string[];
  coverage: {
    functions: number;
    classes: number;
    lines: number;
  };
  errors?: string[];
}

/**
 * مولد الاختبارات التلقائي
 */
export class TestGenerator {
  private apiClient?: OqoolAPIClient;
  private analyzer: CodeAnalyzer;
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.analyzer = new CodeAnalyzer(workingDir);
  }

  /**
   * توليد اختبارات للملفات
   */
  async generateTests(files: string[], options: TestOptions = {}): Promise<TestGenerationResult> {
    const {
      framework = 'jest',
      type = 'unit',
      useAI = false,
      generateMocks = true,
      includeEdgeCases = true,
      outputDir = path.join(this.workingDir, '__tests__'),
      language = 'ar',
    } = options;

    const result: TestGenerationResult = {
      success: true,
      testsGenerated: 0,
      files: [],
      coverage: {
        functions: 0,
        classes: 0,
        lines: 0,
      },
      errors: [],
    };

    try {
      // إنشاء مجلد الاختبارات
      await fs.mkdir(outputDir, { recursive: true });

      // معالجة كل ملف
      for (const file of files) {
        try {
          const testFile = await this.generateTestFile(file, {
            framework,
            type,
            useAI,
            generateMocks,
            includeEdgeCases,
            language,
          });

          if (testFile) {
            result.files.push(testFile);
            result.testsGenerated++;
          }
        } catch (error) {
          result.errors?.push(`Error generating tests for ${file}: ${error}`);
        }
      }

      // حساب التغطية
      result.coverage = await this.calculateCoverage(files);
      result.success = (result.errors?.length || 0) === 0;
    } catch (error) {
      result.success = false;
      result.errors?.push(`Fatal error: ${error}`);
    }

    return result;
  }

  /**
   * توليد ملف اختبار لملف واحد
   */
  private async generateTestFile(
    filePath: string,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): Promise<string | null> {
    const analysis = await this.analyzer.analyzeFile(filePath);

    // تخطي الملفات بدون دوال أو كلاسات
    if (analysis.functions.length === 0 && analysis.classes.length === 0) {
      return null;
    }

    let testContent = this.generateTestHeader(filePath, options);

    // اختبارات الدوال
    for (const func of analysis.functions) {
      const functionTest = await this.generateFunctionTest(func, options);
      testContent += this.generateTestCode(functionTest, options);
    }

    // اختبارات الكلاسات
    for (const cls of analysis.classes) {
      const classTest = await this.generateClassTest(cls, options);
      testContent += this.generateClassTestCode(classTest, options);
    }

    // حفظ ملف الاختبار
    const testFilePath = this.getTestFilePath(filePath, options.framework);
    await fs.writeFile(testFilePath, testContent, 'utf-8');

    return testFilePath;
  }

  /**
   * توليد header ملف الاختبار
   */
  private generateTestHeader(
    sourceFile: string,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): string {
    const moduleName = path.basename(sourceFile, path.extname(sourceFile));
    const importPath = path
      .relative(path.join(this.workingDir, '__tests__'), sourceFile)
      .replace(/\\/g, '/');

    let header = '';

    if (options.framework === 'jest') {
      header = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';\n`;
    } else if (options.framework === 'mocha') {
      header = `import { describe, it, beforeEach, afterEach } from 'mocha';\nimport { expect } from 'chai';\n`;
    } else if (options.framework === 'vitest') {
      header = `import { describe, it, expect, beforeEach, afterEach } from 'vitest';\n`;
    } else if (options.framework === 'ava') {
      header = `import test from 'ava';\n`;
    }

    header += `import * as ${moduleName} from '${importPath}';\n\n`;

    return header;
  }

  /**
   * الحصول على مسار ملف الاختبار
   */
  private getTestFilePath(sourceFile: string, framework: TestFramework): string {
    const ext = path.extname(sourceFile);
    const base = path.basename(sourceFile, ext);
    const testExt = framework === 'jest' || framework === 'vitest' ? '.test.ts' : '.spec.ts';

    return path.join(this.workingDir, '__tests__', base + testExt);
  }

  /**
   * توليد اختبار دالة
   */
  private async generateFunctionTest(
    func: FunctionInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): Promise<FunctionTest> {
    const testCases = await this.generateTestCases(func, options);

    const functionTest: FunctionTest = {
      functionName: func.name,
      testCases,
    };

    if (options.generateMocks) {
      functionTest.mocks = this.generateMocks(func);
    }

    return functionTest;
  }

  /**
   * توليد حالات اختبار
   */
  private async generateTestCases(
    func: FunctionInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    // حالة عادية
    testCases.push(this.generateNormalCase(func, options));

    // حالات الـ edge cases
    if (options.includeEdgeCases) {
      testCases.push(...this.generateEdgeCases(func, options));
    }

    // حالات الأخطاء
    testCases.push(...this.generateErrorCases(func, options));

    return testCases;
  }

  /**
   * توليد حالة عادية
   */
  private generateNormalCase(
    func: FunctionInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): TestCase {
    const inputs = this.generateSampleInputs(func);

    return {
      name:
        options.language === 'ar'
          ? `يجب أن تعمل ${func.name} بشكل صحيح`
          : `${func.name} should work correctly`,
      description: options.language === 'ar' ? 'اختبار الحالة العادية' : 'Test normal case',
      input: inputs,
      expected: this.generateExpectedOutput(func, inputs),
      type: 'normal',
    };
  }

  /**
   * توليد edge cases
   */
  private generateEdgeCases(
    func: FunctionInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): TestCase[] {
    const cases: TestCase[] = [];

    // Empty input
    if (func.params.length > 0) {
      const firstParam = func.params[0];
      // Since params are just strings, we'll test with empty string
      cases.push({
        name:
          options.language === 'ar' ? 'يجب أن تتعامل مع قيم فارغة' : 'should handle empty values',
        description: 'Edge case: empty input',
        input: { [firstParam]: '' },
        expected: null,
        type: 'edge',
      });
    }

    return cases;
  }

  /**
   * توليد حالات الأخطاء
   */
  private generateErrorCases(
    func: FunctionInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): TestCase[] {
    const cases: TestCase[] = [];

    // Null/undefined input
    if (func.params.length > 0) {
      const firstParam = func.params[0];
      cases.push({
        name:
          options.language === 'ar'
            ? 'يجب أن ترمي خطأ عند تمرير null'
            : 'should throw error with null input',
        description: 'Error case: null input',
        input: { [firstParam]: null },
        expected: 'Error',
        type: 'error',
      });
    }

    return cases;
  }

  /**
   * توليد مدخلات عينة
   */
  private generateSampleInputs(func: FunctionInfo): Record<string, any> {
    const inputs: Record<string, any> = {};

    for (const paramName of func.params) {
      inputs[paramName] = 'test';
    }

    return inputs;
  }

  /**
   * توليد قيمة عينة بناءً على النوع
   */
  private generateSampleValue(type?: string): any {
    if (!type || type === 'any') {
      return 'test';
    }

    if (type.includes('string')) {
      return 'test';
    } else if (type.includes('number')) {
      return 42;
    } else if (type.includes('boolean')) {
      return true;
    } else if (type.includes('[]') || type.includes('Array')) {
      return [1, 2, 3];
    } else if (type.includes('object') || type === '{}') {
      return { key: 'value' };
    }

    return null;
  }

  /**
   * توليد الناتج المتوقع
   */
  private generateExpectedOutput(func: FunctionInfo, inputs: Record<string, any>): any {
    // محاولة استنتاج الناتج بناءً على الاسم
    const name = func.name.toLowerCase();

    if (name.startsWith('is') || name.startsWith('has')) {
      return true;
    } else if (name.startsWith('get')) {
      return 'result';
    } else if (name.startsWith('create')) {
      return {};
    } else if (name.startsWith('delete') || name.startsWith('remove')) {
      return true;
    } else if (name.startsWith('count')) {
      return 0;
    } else if (name.startsWith('find')) {
      return null;
    }

    return 'expected result';
  }

  /**
   * توليد mocks
   */
  private generateMocks(func: FunctionInfo): MockDefinition[] {
    const mocks: MockDefinition[] = [];

    // Since params are just strings, create simple mocks
    for (const paramName of func.params) {
      mocks.push({
        name: `mock${this.capitalize(paramName)}`,
        type: 'any',
        implementation: `jest.fn()`,
      });
    }

    return mocks;
  }

  /**
   * التحقق من نوع بدائي
   */
  private isPrimitiveType(type: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'any', 'void', 'null', 'undefined'];
    return primitives.some((p) => type.includes(p));
  }

  /**
   * Capitalize أول حرف
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * توليد كود الاختبار
   */
  private generateTestCode(
    functionTest: FunctionTest,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): string {
    let code = `\ndescribe('${functionTest.functionName}', () => {\n`;

    // Setup mocks
    if (functionTest.mocks && functionTest.mocks.length > 0) {
      code += `  // Mocks\n`;
      for (const mock of functionTest.mocks) {
        code += `  const ${mock.name} = ${mock.implementation};\n`;
      }
      code += `\n`;
    }

    // Test cases
    for (const testCase of functionTest.testCases) {
      code += this.generateTestCaseCode(functionTest.functionName, testCase, options);
    }

    code += `});\n`;
    return code;
  }

  /**
   * توليد كود حالة اختبار واحدة
   */
  private generateTestCaseCode(
    functionName: string,
    testCase: TestCase,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): string {
    let code = `  it('${testCase.name}', async () => {\n`;

    // Setup input
    const inputParams = Object.entries(testCase.input)
      .map(([key, value]) => JSON.stringify(value))
      .join(', ');

    if (testCase.type === 'error') {
      // اختبار الأخطاء
      if (options.framework === 'jest' || options.framework === 'vitest') {
        code += `    await expect(${functionName}(${inputParams})).rejects.toThrow();\n`;
      } else {
        code += `    try {\n`;
        code += `      await ${functionName}(${inputParams});\n`;
        code += `      expect.fail('Should have thrown error');\n`;
        code += `    } catch (error) {\n`;
        code += `      expect(error).to.exist;\n`;
        code += `    }\n`;
      }
    } else {
      // اختبار عادي
      code += `    const result = await ${functionName}(${inputParams});\n`;

      if (options.framework === 'jest' || options.framework === 'vitest') {
        if (testCase.expected !== null && testCase.expected !== 'expected result') {
          code += `    expect(result).toBe(${JSON.stringify(testCase.expected)});\n`;
        } else {
          code += `    expect(result).toBeDefined();\n`;
        }
      } else {
        code += `    expect(result).to.exist;\n`;
      }
    }

    code += `  });\n\n`;
    return code;
  }

  /**
   * توليد اختبار كلاس
   */
  private async generateClassTest(
    cls: ClassInfo,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): Promise<ClassTest> {
    const methods: FunctionTest[] = [];

    for (const methodName of cls.methods) {
      // Create a dummy FunctionInfo from the method name
      const dummyFuncInfo: FunctionInfo = {
        name: methodName,
        type: 'method',
        params: [],
        async: false,
        lineStart: 0,
        lineEnd: 0,
      };
      const methodTest = await this.generateFunctionTest(dummyFuncInfo, options);
      methods.push(methodTest);
    }

    return {
      className: cls.name,
      methods,
      beforeEach: `instance = new ${cls.name}();`,
      afterEach: `instance = null;`,
    };
  }

  /**
   * توليد كود اختبار الكلاس
   */
  private generateClassTestCode(
    classTest: ClassTest,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): string {
    let code = `\ndescribe('${classTest.className}', () => {\n`;
    code += `  let instance: ${classTest.className};\n\n`;

    // beforeEach
    if (classTest.beforeEach) {
      code += `  beforeEach(() => {\n`;
      code += `    ${classTest.beforeEach}\n`;
      code += `  });\n\n`;
    }

    // afterEach
    if (classTest.afterEach) {
      code += `  afterEach(() => {\n`;
      code += `    ${classTest.afterEach}\n`;
      code += `  });\n\n`;
    }

    // Method tests
    for (const method of classTest.methods) {
      code += `  describe('${method.functionName}', () => {\n`;

      for (const testCase of method.testCases) {
        code += this.generateMethodTestCase(method.functionName, testCase, options);
      }

      code += `  });\n\n`;
    }

    code += `});\n`;
    return code;
  }

  /**
   * توليد حالة اختبار ميثود
   */
  private generateMethodTestCase(
    methodName: string,
    testCase: TestCase,
    options: Required<Omit<TestOptions, 'outputDir'>>
  ): string {
    let code = `    it('${testCase.name}', async () => {\n`;

    const inputParams = Object.entries(testCase.input)
      .map(([key, value]) => JSON.stringify(value))
      .join(', ');

    if (testCase.type === 'error') {
      if (options.framework === 'jest' || options.framework === 'vitest') {
        code += `      await expect(instance.${methodName}(${inputParams})).rejects.toThrow();\n`;
      } else {
        code += `      try {\n`;
        code += `        await instance.${methodName}(${inputParams});\n`;
        code += `        expect.fail('Should have thrown error');\n`;
        code += `      } catch (error) {\n`;
        code += `        expect(error).to.exist;\n`;
        code += `      }\n`;
      }
    } else {
      code += `      const result = await instance.${methodName}(${inputParams});\n`;

      if (options.framework === 'jest' || options.framework === 'vitest') {
        code += `      expect(result).toBeDefined();\n`;
      } else {
        code += `      expect(result).to.exist;\n`;
      }
    }

    code += `    });\n`;
    return code;
  }

  /**
   * حساب تغطية الاختبارات
   */
  private async calculateCoverage(files: string[]): Promise<{
    functions: number;
    classes: number;
    lines: number;
  }> {
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalLines = 0;

    for (const file of files) {
      const analysis = await this.analyzer.analyzeFile(file);
      totalFunctions += analysis.functions.length;
      totalClasses += analysis.classes.length;
      totalLines += analysis.stats.codeLines;
    }

    return {
      functions: totalFunctions,
      classes: totalClasses,
      lines: totalLines,
    };
  }

  /**
   * توليد package.json للاختبارات
   */
  async generateTestConfig(framework: TestFramework, outputDir: string): Promise<string> {
    let config = '';

    if (framework === 'jest') {
      config = `{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/__tests__"],
  "testMatch": ["**/*.test.ts"],
  "collectCoverage": true,
  "coverageDirectory": "coverage",
  "coveragePathIgnorePatterns": ["/node_modules/", "/__tests__/"]
}`;
    } else if (framework === 'vitest') {
      config = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});`;
    } else if (framework === 'mocha') {
      config = `{
  "require": ["ts-node/register"],
  "extensions": ["ts"],
  "spec": "__tests__/**/*.spec.ts",
  "watch-files": ["src/**/*.ts", "__tests__/**/*.ts"]
}`;
    }

    const configPath = path.join(
      outputDir,
      framework === 'vitest'
        ? 'vitest.config.ts'
        : framework === 'mocha'
          ? '.mocharc.json'
          : 'jest.config.json'
    );

    await fs.writeFile(configPath, config, 'utf-8');
    return configPath;
  }

  /**
   * تشغيل الاختبارات
   */
  async runTests(framework: TestFramework = 'jest'): Promise<{ success: boolean; output: string }> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execPromise = promisify(exec);

    let command = '';
    if (framework === 'jest') {
      command = 'npx jest';
    } else if (framework === 'vitest') {
      command = 'npx vitest run';
    } else if (framework === 'mocha') {
      command = 'npx mocha';
    } else if (framework === 'ava') {
      command = 'npx ava';
    }

    try {
      const { stdout, stderr } = await execPromise(command, {
        cwd: this.workingDir,
      });

      return {
        success: true,
        output: stdout + (stderr || ''),
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message,
      };
    }
  }
}

/**
 * إنشاء مولد اختبارات
 */
export function createTestGenerator(workingDir: string): TestGenerator {
  return new TestGenerator(workingDir);
}
