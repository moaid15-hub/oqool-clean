# 🎨 قوالب وأمثلة للكود المحسّن

## 📋 محتويات الملف
1. Error Handling Templates
2. Command Structure Template
3. AI Agent Interaction Template
4. Testing Templates
5. Documentation Templates
6. UI/UX Patterns
7. Performance Optimization Patterns

---

## 1. 🚨 Error Handling Templates

### Pattern 1: Basic Error Handler
```typescript
// ❌ قبل (سيء)
try {
  const result = await doSomething();
} catch (error) {
  console.error('Error');
}

// ✅ بعد (جيد)
import chalk from 'chalk';
import ora from 'ora';

async function doSomethingWithErrorHandling() {
  const spinner = ora('جاري المعالجة...').start();
  
  try {
    const result = await doSomething();
    spinner.succeed('تمت العملية بنجاح!');
    return result;
  } catch (error) {
    spinner.fail('فشلت العملية');
    
    console.error(chalk.red('\n❌ خطأ: ') + error.message);
    
    // Provide context
    if (error.code === 'ENOENT') {
      console.log(chalk.yellow('\n💡 حل مقترح:'));
      console.log('   الملف غير موجود. تأكد من المسار الصحيح.');
      console.log(chalk.gray('   أو أنشئ ملف جديد باستخدام: ') + 
                  chalk.cyan('oqool create <filename>'));
    }
    
    // Link to docs
    console.log(chalk.gray('\n📚 للمزيد: ') + 
                chalk.cyan('https://docs.oqool.ai/troubleshooting'));
    
    // Exit gracefully
    process.exit(1);
  }
}
```

### Pattern 2: Async Operation with Retry
```typescript
async function robustOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    operationName = 'العملية'
  } = options;

  const spinner = ora(`جاري ${operationName}...`).start();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      spinner.succeed(`✅ نجح ${operationName}!`);
      return result;
    } catch (error) {
      if (attempt === maxRetries) {
        spinner.fail(`❌ فشل ${operationName} بعد ${maxRetries} محاولات`);
        console.error(chalk.red('\nالخطأ: ') + error.message);
        throw error;
      }
      
      spinner.text = `⏳ محاولة ${attempt}/${maxRetries} - إعادة المحاولة...`;
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error('Unreachable');
}

// Usage:
const result = await robustOperation(
  () => aiAdapter.complete({ prompt: 'test' }),
  { operationName: 'طلب AI', maxRetries: 3 }
);
```

### Pattern 3: Validation with Clear Errors
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateInput(input: any): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Required fields
  if (!input.name) {
    result.errors.push('الاسم مطلوب');
    result.valid = false;
  }

  // Format validation
  if (input.email && !input.email.includes('@')) {
    result.errors.push('البريد الإلكتروني غير صالح');
    result.valid = false;
  }

  // Optional warnings
  if (input.name && input.name.length < 3) {
    result.warnings.push('الاسم قصير جداً (< 3 أحرف)');
  }

  return result;
}

// Usage with user-friendly output:
function processInput(input: any) {
  const validation = validateInput(input);
  
  if (!validation.valid) {
    console.error(chalk.red('\n❌ المدخلات غير صالحة:\n'));
    validation.errors.forEach(error => {
      console.error(chalk.red('  • ') + error);
    });
    process.exit(1);
  }
  
  if (validation.warnings.length > 0) {
    console.warn(chalk.yellow('\n⚠️  تحذيرات:\n'));
    validation.warnings.forEach(warning => {
      console.warn(chalk.yellow('  • ') + warning);
    });
  }
  
  // Continue processing...
}
```

---

## 2. 🎯 Command Structure Template

```typescript
// commands/example-command.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { z } from 'zod'; // for validation

// Types
interface ExampleOptions {
  output?: string;
  format?: 'json' | 'text';
  verbose?: boolean;
}

// Validation schema
const optionsSchema = z.object({
  output: z.string().optional(),
  format: z.enum(['json', 'text']).default('text'),
  verbose: z.boolean().default(false)
});

// Main command function
export async function exampleCommand(
  input: string,
  options: ExampleOptions
): Promise<void> {
  // 1. Validate inputs
  const validatedOptions = optionsSchema.parse(options);
  
  if (!input || input.trim().length === 0) {
    console.error(chalk.red('❌ المدخل مطلوب'));
    console.log(chalk.yellow('\n💡 الاستخدام:'));
    console.log(chalk.cyan('   oqool example <input> [options]'));
    process.exit(1);
  }

  // 2. Show what we're doing
  const spinner = ora('جاري المعالجة...').start();
  
  try {
    // 3. Do the work
    const result = await processExample(input, validatedOptions);
    
    // 4. Success feedback
    spinner.succeed('✅ تمت المعالجة بنجاح!');
    
    // 5. Output results
    if (validatedOptions.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('\n📊 النتيجة:'));
      console.log(chalk.white('  ' + result));
    }
    
    // 6. Next steps (if applicable)
    console.log(chalk.cyan('\n💡 الخطوة التالية:'));
    console.log('  oqool next-command');
    
  } catch (error) {
    // 7. Error handling
    spinner.fail('❌ فشلت المعالجة');
    handleError(error);
  }
}

// Helper functions
async function processExample(
  input: string,
  options: z.infer<typeof optionsSchema>
): Promise<string> {
  // Actual processing logic
  if (options.verbose) {
    console.log(chalk.gray('\n🔍 تفاصيل المعالجة:'));
    console.log(chalk.gray(`  المدخل: ${input}`));
    console.log(chalk.gray(`  التنسيق: ${options.format}`));
  }
  
  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `Processed: ${input}`;
}

function handleError(error: unknown): never {
  if (error instanceof Error) {
    console.error(chalk.red('\n❌ الخطأ: ') + error.message);
    
    // Specific error handling
    if (error.message.includes('network')) {
      console.log(chalk.yellow('\n💡 حل مقترح:'));
      console.log('  تحقق من اتصال الإنترنت');
    }
  }
  
  console.log(chalk.gray('\n📚 للمساعدة: ') + 
              chalk.cyan('https://docs.oqool.ai/commands/example'));
  
  process.exit(1);
}

// Register command
export function registerExampleCommand(program: Command): void {
  program
    .command('example <input>')
    .description('مثال على أمر محسّن')
    .option('-o, --output <path>', 'مسار الإخراج')
    .option('-f, --format <type>', 'تنسيق الإخراج (json|text)', 'text')
    .option('-v, --verbose', 'عرض تفاصيل إضافية', false)
    .action(exampleCommand);
}
```

---

## 3. 🤖 AI Agent Interaction Template

```typescript
// agents/optimized-agent.ts

import { UnifiedAIAdapter, AIProvider } from '../ai-gateway';
import chalk from 'chalk';
import ora from 'ora';

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  provider?: AIProvider;
  cost?: number;
  tokens?: number;
}

export class OptimizedAgent {
  private adapter: UnifiedAIAdapter;
  private verbose: boolean;

  constructor(
    adapter: UnifiedAIAdapter,
    options: { verbose?: boolean } = {}
  ) {
    this.adapter = adapter;
    this.verbose = options.verbose ?? false;
  }

  /**
   * Generate with proper error handling and feedback
   */
  async generate(
    prompt: string,
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): Promise<AgentResponse<string>> {
    const spinner = ora('🤖 جاري التوليد...').start();

    try {
      // Log if verbose
      if (this.verbose) {
        spinner.info('🔍 إعداد الطلب...');
        console.log(chalk.gray(`  التعقيد: ${complexity}`));
        console.log(chalk.gray(`  الطول: ${prompt.length} حرف`));
      }

      // Make the request
      const startTime = Date.now();
      const result = await this.adapter.complete({
        prompt,
        complexity,
        temperature: 0.7,
        maxTokens: 2000
      });

      const duration = Date.now() - startTime;

      if (!result.success) {
        throw new Error(result.error || 'فشل الطلب');
      }

      // Success
      spinner.succeed(`✅ تم التوليد في ${(duration / 1000).toFixed(1)}s`);

      // Show details if verbose
      if (this.verbose) {
        console.log(chalk.gray(`  المزود: ${result.provider}`));
        console.log(chalk.gray(`  التكلفة: $${result.cost?.toFixed(4) || '0'}`));
        console.log(chalk.gray(`  Tokens: ${result.tokens || 'N/A'}`));
      }

      return {
        success: true,
        data: result.content,
        provider: result.provider,
        cost: result.cost,
        tokens: result.tokens
      };

    } catch (error) {
      spinner.fail('❌ فشل التوليد');
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'خطأ غير معروف';

      console.error(chalk.red('\nالخطأ: ') + errorMessage);

      // Suggest solutions
      this.suggestSolutions(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Generate with caching
   */
  private cache = new Map<string, { data: string; timestamp: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async generateCached(
    prompt: string,
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): Promise<AgentResponse<string>> {
    // Check cache
    const cacheKey = `${prompt}-${complexity}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      if (this.verbose) {
        console.log(chalk.green('💾 استخدام النتيجة المخزنة'));
      }
      return {
        success: true,
        data: cached.data
      };
    }

    // Generate new
    const result = await this.generate(prompt, complexity);

    // Cache if successful
    if (result.success && result.data) {
      this.cache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Batch generate with progress
   */
  async generateBatch(
    prompts: string[],
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): Promise<AgentResponse<string>[]> {
    console.log(chalk.cyan(`\n🚀 معالجة ${prompts.length} طلب...\n`));

    const results: AgentResponse<string>[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const spinner = ora(`[${i + 1}/${prompts.length}] جاري المعالجة...`).start();

      try {
        const result = await this.generate(prompts[i], complexity);
        results.push(result);
        
        if (result.success) {
          spinner.succeed(`[${i + 1}/${prompts.length}] ✅`);
        } else {
          spinner.fail(`[${i + 1}/${prompts.length}] ❌`);
        }
      } catch (error) {
        spinner.fail(`[${i + 1}/${prompts.length}] ❌`);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(chalk.green(`\n✅ نجح: ${successful}/${prompts.length}`));
    if (successful < prompts.length) {
      console.log(chalk.red(`❌ فشل: ${prompts.length - successful}/${prompts.length}`));
    }

    return results;
  }

  private suggestSolutions(error: string): void {
    console.log(chalk.yellow('\n💡 حلول مقترحة:'));

    if (error.includes('API key') || error.includes('unauthorized')) {
      console.log('  1. تحقق من مفتاح API');
      console.log(chalk.cyan('     oqool config set deepseek YOUR_KEY'));
    }

    if (error.includes('rate limit') || error.includes('429')) {
      console.log('  1. انتظر قليلاً ثم حاول مرة أخرى');
      console.log('  2. أو استخدم مزود آخر');
      console.log(chalk.cyan('     oqool config set provider claude'));
    }

    if (error.includes('timeout') || error.includes('network')) {
      console.log('  1. تحقق من اتصال الإنترنت');
      console.log('  2. حاول مرة أخرى');
    }

    console.log(chalk.gray('\n📚 التوثيق: ') + 
                chalk.cyan('https://docs.oqool.ai/troubleshooting'));
  }
}
```

---

## 4. 🧪 Testing Templates

### Unit Test Template
```typescript
// __tests__/example.test.ts

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OptimizedAgent } from '../agents/optimized-agent';
import { UnifiedAIAdapter } from '../ai-gateway';

// Mock the AI adapter
jest.mock('../ai-gateway');

describe('OptimizedAgent', () => {
  let agent: OptimizedAgent;
  let mockAdapter: jest.Mocked<UnifiedAIAdapter>;

  beforeEach(() => {
    // Setup
    mockAdapter = new UnifiedAIAdapter({
      deepseek: 'test-key'
    }) as jest.Mocked<UnifiedAIAdapter>;

    agent = new OptimizedAgent(mockAdapter);
  });

  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate successfully with simple prompt', async () => {
      // Arrange
      const prompt = 'test prompt';
      mockAdapter.complete = jest.fn().mockResolvedValue({
        success: true,
        content: 'test response',
        provider: 'deepseek',
        cost: 0.001,
        tokens: 100
      });

      // Act
      const result = await agent.generate(prompt, 'simple');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe('test response');
      expect(result.provider).toBe('deepseek');
      expect(mockAdapter.complete).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockAdapter.complete = jest.fn().mockRejectedValue(
        new Error('API Error')
      );

      // Act
      const result = await agent.generate('test', 'simple');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });

    it('should retry on failure', async () => {
      // Arrange
      mockAdapter.complete = jest.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          success: true,
          content: 'success after retry'
        });

      // Act
      const result = await agent.generate('test');

      // Assert
      expect(result.success).toBe(true);
      expect(mockAdapter.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe('generateCached', () => {
    it('should use cache for duplicate requests', async () => {
      // Arrange
      mockAdapter.complete = jest.fn().mockResolvedValue({
        success: true,
        content: 'cached response'
      });

      // Act
      await agent.generateCached('test');
      const result = await agent.generateCached('test'); // Should use cache

      // Assert
      expect(mockAdapter.complete).toHaveBeenCalledTimes(1); // Only once!
      expect(result.data).toBe('cached response');
    });
  });
});
```

### Integration Test Template
```typescript
// __tests__/integration/cli-flow.test.ts

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('CLI Integration Tests', () => {
  const testDir = join(__dirname, '../../test-output');

  beforeAll(() => {
    // Setup test environment
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should initialize a new project', () => {
    const output = execSync('oqool init test-project --no-interactive', {
      cwd: testDir,
      encoding: 'utf-8'
    });

    expect(output).toContain('success');
    expect(existsSync(join(testDir, 'test-project'))).toBe(true);
    expect(existsSync(join(testDir, 'test-project/package.json'))).toBe(true);
  });

  it('should generate code with AI', () => {
    const output = execSync('oqool generate "create a function that adds two numbers"', {
      cwd: testDir,
      encoding: 'utf-8'
    });

    expect(output).toContain('function');
    expect(output).toContain('add');
  });
});
```

---

## 5. 📝 Documentation Templates

### Command Documentation Template
```markdown
# `oqool example` Command

## Overview
Brief description of what this command does.

## Syntax
\`\`\`bash
oqool example <input> [options]
\`\`\`

## Arguments

### `<input>`
- **Type:** String
- **Required:** Yes
- **Description:** Description of the input parameter

## Options

### `-o, --output <path>`
- **Type:** String
- **Default:** Current directory
- **Description:** Path where output will be saved

### `-f, --format <type>`
- **Type:** `json` | `text`
- **Default:** `text`
- **Description:** Output format

### `-v, --verbose`
- **Type:** Boolean
- **Default:** `false`
- **Description:** Show detailed output

## Examples

### Basic Usage
\`\`\`bash
oqool example "my input"
\`\`\`

Output:
\`\`\`
✅ Success!
Result: ...
\`\`\`

### With Options
\`\`\`bash
oqool example "my input" --format json --output ./result.json
\`\`\`

### Advanced Example
\`\`\`bash
oqool example "complex input" -v -f json
\`\`\`

## Common Use Cases

### Use Case 1: Quick Generation
Perfect for when you need to...

### Use Case 2: Detailed Analysis
Use the verbose flag when you want to...

## Tips & Tricks

💡 **Tip 1:** You can pipe output to other commands:
\`\`\`bash
oqool example "input" | grep "pattern"
\`\`\`

💡 **Tip 2:** Use aliases for common operations:
\`\`\`bash
alias oq-example='oqool example --format json'
\`\`\`

## Troubleshooting

### Error: "Input required"
**Cause:** No input provided
**Solution:** Provide input as argument:
\`\`\`bash
oqool example "your input here"
\`\`\`

### Error: "Invalid format"
**Cause:** Format must be 'json' or 'text'
**Solution:** Use correct format:
\`\`\`bash
oqool example "input" --format text
\`\`\`

## Related Commands
- [`oqool related-command`](./related-command.md) - Description
- [`oqool another-command`](./another-command.md) - Description

## See Also
- [Getting Started Guide](../guide/getting-started.md)
- [API Reference](../api/reference.md)
```

---

## 6. 🎨 UI/UX Patterns

### Progress Feedback Pattern
```typescript
import ora, { Ora } from 'ora';
import chalk from 'chalk';

class ProgressManager {
  private spinner: Ora | null = null;
  private startTime: number = 0;

  start(message: string): void {
    this.startTime = Date.now();
    this.spinner = ora(message).start();
  }

  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeed(message?: string): void {
    const duration = Date.now() - this.startTime;
    const finalMessage = message || this.spinner?.text || 'Done';
    
    this.spinner?.succeed(
      `${finalMessage} ${chalk.gray(`(${(duration / 1000).toFixed(1)}s)`)}`
    );
  }

  fail(message?: string): void {
    this.spinner?.fail(message);
  }

  // Advanced: Multi-step progress
  async runSteps(
    steps: Array<{
      name: string;
      action: () => Promise<any>;
    }>
  ): Promise<void> {
    console.log(chalk.cyan(`\n🚀 تنفيذ ${steps.length} خطوة...\n`));

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      this.start(`[${i + 1}/${steps.length}] ${step.name}...`);

      try {
        await step.action();
        this.succeed(`[${i + 1}/${steps.length}] ✅ ${step.name}`);
      } catch (error) {
        this.fail(`[${i + 1}/${steps.length}] ❌ ${step.name}`);
        throw error;
      }
    }

    console.log(chalk.green('\n✅ اكتملت جميع الخطوات!\n'));
  }
}

// Usage:
const progress = new ProgressManager();

await progress.runSteps([
  {
    name: 'تحليل المشروع',
    action: async () => {
      // analysis code
    }
  },
  {
    name: 'توليد الكود',
    action: async () => {
      // generation code
    }
  },
  {
    name: 'حفظ الملفات',
    action: async () => {
      // save code
    }
  }
]);
```

### Interactive Prompts Pattern
```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';

async function interactiveSetup(): Promise<void> {
  console.log(chalk.cyan.bold('\n🎯 إعداد Oqool AI\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'ما اسم المشروع؟',
      default: 'my-project',
      validate: (input: string) => {
        if (input.trim().length === 0) {
          return 'الاسم مطلوب';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'استخدم أحرف صغيرة وأرقام وشرطات فقط';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'framework',
      message: 'اختر الإطار:',
      choices: [
        { name: '⚛️  React', value: 'react' },
        { name: '🔺 Vue', value: 'vue' },
        { name: '📘 Angular', value: 'angular' },
        { name: '🟢 Node.js', value: 'nodejs' }
      ]
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'اختر الميزات:',
      choices: [
        { name: 'TypeScript', checked: true },
        { name: 'ESLint', checked: true },
        { name: 'Prettier', checked: true },
        { name: 'Testing (Jest)', checked: false },
        { name: 'Git', checked: true }
      ]
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'هل تريد تثبيت Dependencies الآن؟',
      default: true
    }
  ]);

  // Show summary
  console.log(chalk.green('\n📋 ملخص الإعداد:\n'));
  console.log(chalk.white(`  الاسم: ${answers.name}`));
  console.log(chalk.white(`  الإطار: ${answers.framework}`));
  console.log(chalk.white(`  الميزات: ${answers.features.join(', ')}`));
  console.log();

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'هل تريد المتابعة؟',
      default: true
    }
  ]);

  if (!confirmed) {
    console.log(chalk.yellow('تم الإلغاء'));
    process.exit(0);
  }

  // Proceed with setup...
}
```

---

## 7. ⚡ Performance Optimization Patterns

### Lazy Loading Pattern
```typescript
// Before: Load everything upfront
import { command1 } from './commands/command1';
import { command2 } from './commands/command2';
import { command3 } from './commands/command3';
// ... 80+ imports

// After: Lazy load on demand
const commands = new Map<string, () => Promise<any>>([
  ['command1', () => import('./commands/command1')],
  ['command2', () => import('./commands/command2')],
  ['command3', () => import('./commands/command3')],
  // ...
]);

async function executeCommand(name: string, args: any): Promise<void> {
  const loader = commands.get(name);
  
  if (!loader) {
    throw new Error(`Unknown command: ${name}`);
  }

  // Load only when needed
  const module = await loader();
  await module.execute(args);
}
```

### Caching Pattern
```typescript
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class Cache {
  private cacheDir: string;
  private ttl: number; // Time to live in ms

  constructor(cacheDir: string, ttl: number = 3600000) {
    this.cacheDir = cacheDir;
    this.ttl = ttl;
  }

  private getCacheKey(key: string): string {
    return createHash('md5').update(key).digest('hex');
  }

  private getCachePath(key: string): string {
    return join(this.cacheDir, this.getCacheKey(key) + '.json');
  }

  get<T>(key: string): T | null {
    const path = this.getCachePath(key);

    if (!existsSync(path)) {
      return null;
    }

    try {
      const cached = JSON.parse(readFileSync(path, 'utf-8'));

      // Check if expired
      if (Date.now() - cached.timestamp > this.ttl) {
        return null;
      }

      return cached.data as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T): void {
    const path = this.getCachePath(key);
    
    writeFileSync(path, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }

  clear(): void {
    // Implementation to clear cache
  }
}

// Usage with AI responses:
const cache = new Cache('./.oqool/cache');

async function getCachedAIResponse(prompt: string): Promise<string> {
  // Check cache first
  const cached = cache.get<string>(`ai:${prompt}`);
  if (cached) {
    console.log(chalk.green('💾 Using cached response'));
    return cached;
  }

  // Generate new
  const response = await aiAdapter.complete({ prompt });
  
  // Cache it
  if (response.success) {
    cache.set(`ai:${prompt}`, response.content);
  }

  return response.content;
}
```

---

## 📚 استخدام القوالب

### كيفية استخدام هذه القوالب:

1. **انسخ القالب المناسب**
2. **عدّل حسب احتياجاتك**
3. **احتفظ بالـ patterns الأساسية**
4. **اختبر جيداً**

### Best Practices:

```typescript
✅ Do:
- استخدم TypeScript للـ type safety
- أضف error handling شامل
- وفر feedback واضح للمستخدم
- استخدم validation
- اكتب tests

❌ Don't:
- تتجاهل الأخطاء
- تستخدم console.log للـ production
- تنسى documentation
- تهمل performance
```

---

**هذه القوالب جاهزة للاستخدام الفوري في مشروع Oqool AI!** 🚀
