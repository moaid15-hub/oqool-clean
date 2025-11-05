/**
 * Request Validator System
 *
 * نظام فحص الطلبات قبل تنفيذها لحماية من:
 * - الأوامر الخطيرة
 * - SQL/Code Injection
 * - الوصول لملفات النظام
 * - الأنماط الضارة
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface ValidationRule {
  name: string;
  validate: (value: any) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Dangerous patterns to block
 */
export const DANGEROUS_PATTERNS = {
  // File system operations
  DELETE_ALL: /rm\s+-rf\s+\/|rmdir\s+\/\s+\/s|del\s+\/f\s+\/s\s+\/q\s+\*/i,
  SYSTEM_FILES: /\/(etc|sys|proc|boot|dev|root)\/|C:\\(Windows|System32)/i,

  // Code execution
  EVAL: /eval\s*\(|exec\s*\(|Function\s*\(|setTimeout\s*\(.*eval/i,
  SHELL_INJECTION: /;\s*rm\s|&&\s*rm\s|\|\s*rm\s|`.*rm\s/i,

  // SQL Injection
  SQL_INJECTION: /'.*OR.*'='|;.*DROP\s+TABLE|;.*DELETE\s+FROM|UNION.*SELECT|--.*$/i,

  // Path traversal
  PATH_TRAVERSAL: /\.\.\//g,

  // Network attacks
  SSRF: /file:\/\/|gopher:\/\/|dict:\/\/|ftp:\/\/.*@/i,

  // Environment variables exposure
  ENV_LEAK: /process\.env|env\s+\||printenv|export.*PASSWORD|export.*SECRET/i,

  // Cryptocurrency mining
  CRYPTO_MINING: /coinhive|cryptonight|stratum\+tcp/i,
};

/**
 * System file paths to protect
 */
export const PROTECTED_PATHS = [
  '/etc',
  '/sys',
  '/proc',
  '/boot',
  '/dev',
  '/root',
  'C:\\Windows',
  'C:\\System32',
  '/System/Library',
  '/usr/bin',
  '/usr/sbin',
];

/**
 * Request Validator Class
 */
export class RequestValidator {
  /**
   * Validate general request
   */
  static validateRequest(request: {
    method?: string;
    headers?: Record<string, any>;
    body?: any;
    params?: Record<string, any>;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate body
    if (request.body && typeof request.body !== 'object') {
      errors.push('Invalid request body format');
    }

    // Validate headers for injection
    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (typeof value === 'string' && this.containsSQLInjection(value)) {
          errors.push(`Potential SQL injection in header: ${key}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate command for dangerous patterns
   */
  static validateCommand(command: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check dangerous patterns
    for (const [name, pattern] of Object.entries(DANGEROUS_PATTERNS)) {
      if (pattern.test(command)) {
        errors.push(`Dangerous pattern detected: ${name}`);
      }
    }

    // Check for protected paths
    for (const path of PROTECTED_PATHS) {
      if (command.includes(path)) {
        warnings.push(`Command accesses protected path: ${path}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate file path
   */
  static validateFilePath(filePath: string, options?: { allowSystem?: boolean }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check path traversal
    if (DANGEROUS_PATTERNS.PATH_TRAVERSAL.test(filePath)) {
      errors.push('Path traversal detected');
    }

    // Check protected paths (unless explicitly allowed)
    if (!options?.allowSystem) {
      for (const path of PROTECTED_PATHS) {
        if (filePath.startsWith(path)) {
          errors.push(`Access to system path not allowed: ${path}`);
        }
      }
    }

    // Check for null bytes
    if (filePath.includes('\0')) {
      errors.push('Null byte detected in path');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate code content
   */
  static validateCode(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for eval
    if (DANGEROUS_PATTERNS.EVAL.test(code)) {
      errors.push('Code contains eval() or similar dangerous functions');
    }

    // Check for environment leaks
    if (DANGEROUS_PATTERNS.ENV_LEAK.test(code)) {
      warnings.push('Code accesses environment variables');
    }

    // Check for crypto mining
    if (DANGEROUS_PATTERNS.CRYPTO_MINING.test(code)) {
      errors.push('Potential cryptocurrency mining code detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate AI prompt
   */
  static validateAIPrompt(prompt: string, maxLength: number = 10000): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check length
    if (prompt.length > maxLength) {
      errors.push(`Prompt exceeds maximum length (${maxLength} characters)`);
    }

    // Check for injection attempts
    if (this.containsSQLInjection(prompt)) {
      warnings.push('Prompt contains SQL-like patterns');
    }

    // Check for prompt injection patterns
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /disregard\s+all\s+prior/i,
      /forget\s+everything/i,
      /new\s+instructions:/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(prompt)) {
        warnings.push('Potential prompt injection detected');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate API token/key
   */
  static validateAPIKey(key: string, provider?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if empty
    if (!key || key.trim().length === 0) {
      errors.push('API key is empty');
      return { valid: false, errors, warnings };
    }

    // Check format based on provider
    if (provider) {
      const formats: Record<string, RegExp> = {
        gemini: /^AIzaSy[A-Za-z0-9_-]{33}$/,
        claude: /^sk-ant-[A-Za-z0-9_-]+$/,
        openai: /^sk-proj-[A-Za-z0-9_-]+$|^sk-[A-Za-z0-9_-]{48}$/,
        deepseek: /^sk-[A-Za-z0-9_-]+$/,
      };

      const format = formats[provider.toLowerCase()];
      if (format && !format.test(key)) {
        errors.push(`Invalid API key format for ${provider}`);
      }
    }

    // Check for obviously fake keys
    if (key === 'your-api-key' || key === 'test' || key === 'dummy') {
      errors.push('API key appears to be a placeholder');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate numeric input
   */
  static validateNumber(
    value: any,
    options?: { min?: number; max?: number; integer?: boolean }
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if it's a number
    const num = Number(value);
    if (isNaN(num)) {
      errors.push('Value is not a valid number');
      return { valid: false, errors, warnings };
    }

    // Check if integer required
    if (options?.integer && !Number.isInteger(num)) {
      errors.push('Value must be an integer');
    }

    // Check range
    if (options?.min !== undefined && num < options.min) {
      errors.push(`Value must be at least ${options.min}`);
    }

    if (options?.max !== undefined && num > options.max) {
      errors.push(`Value must not exceed ${options.max}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized: num,
    };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate URL
   */
  static validateURL(url: string, options?: { allowedProtocols?: string[] }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const parsed = new URL(url);

      // Check protocol
      const allowedProtocols = options?.allowedProtocols || ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        errors.push(`Protocol ${parsed.protocol} not allowed`);
      }

      // Check for SSRF patterns
      if (DANGEROUS_PATTERNS.SSRF.test(url)) {
        errors.push('Potential SSRF attack detected');
      }

      // Check for localhost/internal IPs
      const internalPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /192\.168\./,
        /10\./,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./,
      ];

      for (const pattern of internalPatterns) {
        if (pattern.test(parsed.hostname)) {
          warnings.push('URL points to internal/local address');
          break;
        }
      }
    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/;/g, '') // Remove semicolons
      .trim();
  }

  /**
   * Check for SQL injection patterns
   */
  private static containsSQLInjection(input: string): boolean {
    return DANGEROUS_PATTERNS.SQL_INJECTION.test(input);
  }
}

/**
 * Validation middleware for CLI operations
 */
export async function validateOperation<T>(
  operation: string,
  input: any,
  executor: () => Promise<T>
): Promise<T> {
  // Validate based on operation type
  let result: ValidationResult;

  switch (operation) {
    case 'command':
      result = RequestValidator.validateCommand(input);
      break;
    case 'file':
      result = RequestValidator.validateFilePath(input);
      break;
    case 'code':
      result = RequestValidator.validateCode(input);
      break;
    case 'prompt':
      result = RequestValidator.validateAIPrompt(input);
      break;
    default:
      result = { valid: true, errors: [], warnings: [] };
  }

  // Show warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  Warnings:', result.warnings.join(', '));
  }

  // Block if errors
  if (!result.valid) {
    throw new Error(`Validation failed: ${result.errors.join(', ')}`);
  }

  // Execute if valid
  return await executor();
}

/**
 * Batch validator for multiple inputs
 */
export class BatchValidator {
  private validators: Array<() => ValidationResult> = [];

  add(validator: () => ValidationResult): this {
    this.validators.push(validator);
    return this;
  }

  validate(): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const validator of this.validators) {
      const result = validator();
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }
}
