// tool-adapter.ts
// ============================================
// 🔧 Tool Adapter - محول الأدوات المتقدم
// ============================================
// Intelligent tool conversion between different AI provider formats
// with validation, optimization, and compatibility checking
// ============================================

// ============================================
// 📊 Core Types & Interfaces
// ============================================

/**
 * Unified Tool Definition - تعريف موحد للأداة
 */
export interface UnifiedTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, PropertySchema>;
    required?: string[];
    additionalProperties?: boolean;
  };
  metadata?: {
    category?: string;
    tags?: string[];
    version?: string;
    author?: string;
    dangerous?: boolean; // Requires extra confirmation
    async?: boolean; // Async operation
    cacheable?: boolean; // Can results be cached
  };
}

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;
  enum?: any[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  default?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  required?: string[];
  nullable?: boolean;
  examples?: any[];
}

/**
 * Provider-specific Tool Formats
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface GeminiTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface DeepSeekTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Tool Call Result - نتيجة استدعاء الأداة
 */
export interface ToolCallResult {
  toolName: string;
  callId?: string;
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime?: number;
    cached?: boolean;
    retries?: number;
  };
}

/**
 * Tool Validation Result - نتيجة التحقق من الأداة
 */
export interface ToolValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score: number; // 0-100
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'error';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning' | 'info';
  suggestion?: string;
}

/**
 * Tool Compatibility Check - فحص التوافق
 */
export interface CompatibilityCheck {
  provider: string;
  compatible: boolean;
  limitations: string[];
  requiredModifications: string[];
  confidence: number; // 0-1
}

// ============================================
// 🔧 Tool Adapter Class
// ============================================

export class ToolAdapter {
  private logger: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void;
  private validationCache: Map<string, ToolValidationResult> = new Map();
  private conversionCache: Map<string, any> = new Map();

  // Provider-specific feature support
  private providerCapabilities = {
    claude: {
      supportsAsyncTools: true,
      supportsNestedObjects: true,
      maxDescriptionLength: 1024,
      maxToolNameLength: 64,
      supportedTypes: ['string', 'number', 'boolean', 'array', 'object'],
      supportsEnums: true,
      supportsNullable: true,
      supportsDefaults: false,
    },
    openai: {
      supportsAsyncTools: true,
      supportsNestedObjects: true,
      maxDescriptionLength: 1024,
      maxToolNameLength: 64,
      supportedTypes: ['string', 'number', 'boolean', 'array', 'object'],
      supportsEnums: true,
      supportsNullable: false,
      supportsDefaults: false,
    },
    gemini: {
      supportsAsyncTools: false,
      supportsNestedObjects: true,
      maxDescriptionLength: 512,
      maxToolNameLength: 64,
      supportedTypes: ['string', 'number', 'boolean', 'array', 'object'],
      supportsEnums: true,
      supportsNullable: false,
      supportsDefaults: false,
    },
    deepseek: {
      supportsAsyncTools: true,
      supportsNestedObjects: true,
      maxDescriptionLength: 1024,
      maxToolNameLength: 64,
      supportedTypes: ['string', 'number', 'boolean', 'array', 'object'],
      supportsEnums: true,
      supportsNullable: false,
      supportsDefaults: false,
    },
  };

  constructor(
    logger?: (message: string, level: 'info' | 'warn' | 'error' | 'debug') => void
  ) {
    this.logger =
      logger ||
      ((message: string, level: string) => {
        const emoji = { info: '🔧', warn: '⚠️', error: '❌', debug: '🔍' }[level];
        console.log(`${emoji} [ToolAdapter] ${message}`);
      });

    this.logger('Tool Adapter initialized', 'info');
  }

  // ============================================
  // 🔄 Conversion Methods
  // ============================================

  /**
   * Convert unified tool to Claude format
   * تحويل الأداة الموحدة إلى صيغة Claude
   */
  toClaudeFormat(tool: UnifiedTool): ClaudeTool {
    const cacheKey = `claude:${tool.name}`;
    const cached = this.conversionCache.get(cacheKey);
    if (cached) return cached;

    this.logger(`Converting ${tool.name} to Claude format`, 'debug');

    const claudeTool: ClaudeTool = {
      name: this.sanitizeToolName(tool.name, 'claude'),
      description: this.truncateDescription(tool.description, 'claude'),
      input_schema: {
        type: 'object',
        properties: this.convertProperties(tool.inputSchema.properties, 'claude'),
        required: tool.inputSchema.required || [],
      },
    };

    // Validate conversion
    const validation = this.validateClaudeTool(claudeTool);
    if (!validation.valid) {
      this.logger(
        `Warning: Converted Claude tool has ${validation.errors.length} errors`,
        'warn'
      );
    }

    this.conversionCache.set(cacheKey, claudeTool);
    return claudeTool;
  }

  /**
   * Convert unified tool to OpenAI format
   * تحويل الأداة الموحدة إلى صيغة OpenAI
   */
  toOpenAIFormat(tool: UnifiedTool): OpenAITool {
    const cacheKey = `openai:${tool.name}`;
    const cached = this.conversionCache.get(cacheKey);
    if (cached) return cached;

    this.logger(`Converting ${tool.name} to OpenAI format`, 'debug');

    const openaiTool: OpenAITool = {
      type: 'function',
      function: {
        name: this.sanitizeToolName(tool.name, 'openai'),
        description: this.truncateDescription(tool.description, 'openai'),
        parameters: {
          type: 'object',
          properties: this.convertProperties(tool.inputSchema.properties, 'openai'),
          required: tool.inputSchema.required || [],
        },
      },
    };

    this.conversionCache.set(cacheKey, openaiTool);
    return openaiTool;
  }

  /**
   * Convert unified tool to Gemini format
   * تحويل الأداة الموحدة إلى صيغة Gemini
   */
  toGeminiFormat(tool: UnifiedTool): GeminiTool {
    const cacheKey = `gemini:${tool.name}`;
    const cached = this.conversionCache.get(cacheKey);
    if (cached) return cached;

    this.logger(`Converting ${tool.name} to Gemini format`, 'debug');

    const geminiTool: GeminiTool = {
      name: this.sanitizeToolName(tool.name, 'gemini'),
      description: this.truncateDescription(tool.description, 'gemini'),
      parameters: {
        type: 'object',
        properties: this.convertProperties(tool.inputSchema.properties, 'gemini'),
        required: tool.inputSchema.required || [],
      },
    };

    this.conversionCache.set(cacheKey, geminiTool);
    return geminiTool;
  }

  /**
   * Convert unified tool to DeepSeek format
   * تحويل الأداة الموحدة إلى صيغة DeepSeek
   */
  toDeepSeekFormat(tool: UnifiedTool): DeepSeekTool {
    const cacheKey = `deepseek:${tool.name}`;
    const cached = this.conversionCache.get(cacheKey);
    if (cached) return cached;

    this.logger(`Converting ${tool.name} to DeepSeek format`, 'debug');

    const deepseekTool: DeepSeekTool = {
      type: 'function',
      function: {
        name: this.sanitizeToolName(tool.name, 'deepseek'),
        description: this.truncateDescription(tool.description, 'deepseek'),
        parameters: {
          type: 'object',
          properties: this.convertProperties(tool.inputSchema.properties, 'deepseek'),
          required: tool.inputSchema.required || [],
        },
      },
    };

    this.conversionCache.set(cacheKey, deepseekTool);
    return deepseekTool;
  }

  /**
   * Convert to any provider format
   * تحويل إلى أي صيغة مزود
   */
  toProviderFormat(
    tool: UnifiedTool,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): ClaudeTool | OpenAITool | GeminiTool | DeepSeekTool {
    switch (provider) {
      case 'claude':
        return this.toClaudeFormat(tool);
      case 'openai':
        return this.toOpenAIFormat(tool);
      case 'gemini':
        return this.toGeminiFormat(tool);
      case 'deepseek':
        return this.toDeepSeekFormat(tool);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Batch convert multiple tools
   * تحويل دفعة من الأدوات
   */
  toProviderFormatBatch(
    tools: UnifiedTool[],
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): Array<ClaudeTool | OpenAITool | GeminiTool | DeepSeekTool> {
    this.logger(`Batch converting ${tools.length} tools to ${provider} format`, 'info');

    return tools.map((tool) => this.toProviderFormat(tool, provider));
  }

  // ============================================
  // 🔍 Validation Methods
  // ============================================

  /**
   * Validate unified tool
   * التحقق من الأداة الموحدة
   */
  validateTool(tool: UnifiedTool): ToolValidationResult {
    const cacheKey = `validate:${tool.name}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached) return cached;

    this.logger(`Validating tool: ${tool.name}`, 'debug');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // 1. Name validation
    if (!tool.name || tool.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Tool name is required',
        severity: 'critical',
      });
    } else {
      if (tool.name.length > 64) {
        errors.push({
          field: 'name',
          message: 'Tool name exceeds maximum length of 64 characters',
          severity: 'error',
          suggestion: 'Use a shorter, more concise name',
        });
      }

      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tool.name)) {
        errors.push({
          field: 'name',
          message: 'Tool name must be valid identifier (alphanumeric + underscore)',
          severity: 'error',
          suggestion: 'Use only letters, numbers, and underscores',
        });
      }

      if (tool.name.includes('__')) {
        warnings.push({
          field: 'name',
          message: 'Double underscores in name may cause issues',
          severity: 'warning',
          suggestion: 'Avoid consecutive underscores',
        });
      }
    }

    // 2. Description validation
    if (!tool.description || tool.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Tool description is required',
        severity: 'critical',
      });
    } else {
      if (tool.description.length < 20) {
        warnings.push({
          field: 'description',
          message: 'Description is too brief',
          severity: 'warning',
          suggestion: 'Provide more detailed description for better AI understanding',
        });
      }

      if (tool.description.length > 1024) {
        warnings.push({
          field: 'description',
          message: 'Description is very long',
          severity: 'info',
          suggestion: 'Consider condensing to key information',
        });
      }
    }

    // 3. Schema validation
    if (!tool.inputSchema || !tool.inputSchema.properties) {
      errors.push({
        field: 'inputSchema',
        message: 'Input schema is required',
        severity: 'critical',
      });
    } else {
      const schemaValidation = this.validateSchema(tool.inputSchema);
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);
    }

    // 4. Metadata validation
    if (tool.metadata?.dangerous && !tool.description.toLowerCase().includes('danger')) {
      warnings.push({
        field: 'metadata.dangerous',
        message: 'Dangerous tool should mention risks in description',
        severity: 'warning',
        suggestion: 'Add warning about dangerous operations in description',
      });
    }

    // 5. Generate suggestions
    if (errors.length === 0) {
      if (!tool.metadata?.category) {
        suggestions.push('Consider adding a category to help organize tools');
      }

      if (!tool.metadata?.tags || tool.metadata.tags.length === 0) {
        suggestions.push('Add tags to improve discoverability');
      }

      if (Object.keys(tool.inputSchema.properties).length > 10) {
        suggestions.push('Consider splitting into multiple tools for simplicity');
      }

      if (!tool.inputSchema.required || tool.inputSchema.required.length === 0) {
        suggestions.push('Specify required parameters to prevent errors');
      }
    }

    // Calculate score
    let score = 100;
    score -= errors.filter((e) => e.severity === 'critical').length * 30;
    score -= errors.filter((e) => e.severity === 'error').length * 15;
    score -= warnings.filter((w) => w.severity === 'warning').length * 5;
    score -= warnings.filter((w) => w.severity === 'info').length * 2;
    score = Math.max(0, score);

    const result: ToolValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Validate schema recursively
   * التحقق من المخطط بشكل تكراري
   */
  private validateSchema(
    schema: UnifiedTool['inputSchema'],
    path: string = 'inputSchema'
  ): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check properties
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const propPath = `${path}.${key}`;

        // Type validation
        if (!prop.type) {
          errors.push({
            field: propPath,
            message: 'Property type is required',
            severity: 'error',
          });
        }

        // Description validation
        if (!prop.description || prop.description.length < 10) {
          warnings.push({
            field: propPath,
            message: 'Property should have descriptive explanation',
            severity: 'warning',
            suggestion: 'Add clear description to help AI use this parameter correctly',
          });
        }

        // Array validation
        if (prop.type === 'array' && !prop.items) {
          errors.push({
            field: propPath,
            message: 'Array type must define items schema',
            severity: 'error',
          });
        }

        // Object validation (recursive)
        if (prop.type === 'object' && prop.properties) {
          const nestedValidation = this.validateSchema(
            { type: 'object', properties: prop.properties, required: prop.required },
            propPath
          );
          errors.push(...nestedValidation.errors);
          warnings.push(...nestedValidation.warnings);
        }

        // Enum validation
        if (prop.enum && prop.enum.length === 0) {
          errors.push({
            field: propPath,
            message: 'Enum must have at least one value',
            severity: 'error',
          });
        }

        // Number constraints
        if (prop.type === 'number') {
          if (prop.minimum !== undefined && prop.maximum !== undefined) {
            if (prop.minimum > prop.maximum) {
              errors.push({
                field: propPath,
                message: 'Minimum value cannot be greater than maximum',
                severity: 'error',
              });
            }
          }
        }

        // String constraints
        if (prop.type === 'string') {
          if (prop.minLength !== undefined && prop.maxLength !== undefined) {
            if (prop.minLength > prop.maxLength) {
              errors.push({
                field: propPath,
                message: 'Minimum length cannot be greater than maximum length',
                severity: 'error',
              });
            }
          }
        }
      }
    }

    // Required validation
    if (schema.required) {
      for (const reqField of schema.required) {
        if (!schema.properties || !schema.properties[reqField]) {
          errors.push({
            field: `${path}.required`,
            message: `Required field '${reqField}' not found in properties`,
            severity: 'error',
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate Claude-specific tool
   * التحقق من أداة Claude
   */
  private validateClaudeTool(tool: ClaudeTool): ToolValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const caps = this.providerCapabilities.claude;

    if (tool.name.length > caps.maxToolNameLength) {
      errors.push({
        field: 'name',
        message: `Name exceeds Claude's maximum of ${caps.maxToolNameLength} characters`,
        severity: 'error',
      });
    }

    if (tool.description.length > caps.maxDescriptionLength) {
      warnings.push({
        field: 'description',
        message: `Description may be truncated (max ${caps.maxDescriptionLength} chars)`,
        severity: 'warning',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
      score: 100 - errors.length * 20 - warnings.length * 5,
    };
  }

  // ============================================
  // 🔍 Compatibility Checking
  // ============================================

  /**
   * Check tool compatibility with provider
   * فحص توافق الأداة مع المزود
   */
  checkCompatibility(
    tool: UnifiedTool,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): CompatibilityCheck {
    this.logger(`Checking compatibility for ${tool.name} with ${provider}`, 'debug');

    const caps = this.providerCapabilities[provider];
    const limitations: string[] = [];
    const requiredModifications: string[] = [];
    let compatible = true;
    let confidence = 1.0;

    // Check name length
    if (tool.name.length > caps.maxToolNameLength) {
      compatible = false;
      requiredModifications.push(`Shorten name to ${caps.maxToolNameLength} characters`);
      confidence *= 0.5;
    }

    // Check description length
    if (tool.description.length > caps.maxDescriptionLength) {
      limitations.push(`Description will be truncated to ${caps.maxDescriptionLength} characters`);
      confidence *= 0.9;
    }

    // Check async support
    if (tool.metadata?.async && !caps.supportsAsyncTools) {
      limitations.push('Provider may not handle async operations optimally');
      confidence *= 0.8;
    }

    // Check property types
    const unsupportedTypes = this.findUnsupportedTypes(tool.inputSchema.properties, caps);
    if (unsupportedTypes.length > 0) {
      compatible = false;
      requiredModifications.push(
        `Convert unsupported types: ${unsupportedTypes.join(', ')}`
      );
      confidence *= 0.6;
    }

    // Check nullable support
    if (!caps.supportsNullable) {
      const hasNullable = this.hasNullableProperties(tool.inputSchema.properties);
      if (hasNullable) {
        limitations.push('Nullable properties will be treated as optional');
        confidence *= 0.9;
      }
    }

    // Check nested objects depth
    const maxDepth = this.getMaxNestingDepth(tool.inputSchema.properties);
    if (maxDepth > 3) {
      limitations.push('Deep nesting (>3 levels) may cause issues');
      confidence *= 0.85;
    }

    return {
      provider,
      compatible,
      limitations,
      requiredModifications,
      confidence,
    };
  }

  /**
   * Check compatibility with all providers
   * فحص التوافق مع جميع المزودين
   */
  checkAllCompatibility(tool: UnifiedTool): Record<string, CompatibilityCheck> {
    return {
      claude: this.checkCompatibility(tool, 'claude'),
      openai: this.checkCompatibility(tool, 'openai'),
      gemini: this.checkCompatibility(tool, 'gemini'),
      deepseek: this.checkCompatibility(tool, 'deepseek'),
    };
  }

  // ============================================
  // 🔧 Helper Methods
  // ============================================

  /**
   * Sanitize tool name for provider
   * تنظيف اسم الأداة للمزود
   */
  private sanitizeToolName(
    name: string,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): string {
    const caps = this.providerCapabilities[provider];

    // Remove invalid characters
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');

    // Ensure starts with letter or underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }

    // Truncate if too long
    if (sanitized.length > caps.maxToolNameLength) {
      sanitized = sanitized.substring(0, caps.maxToolNameLength);
      this.logger(`Tool name truncated to ${caps.maxToolNameLength} characters`, 'warn');
    }

    return sanitized;
  }

  /**
   * Truncate description for provider
   * اختصار الوصف للمزود
   */
  private truncateDescription(
    description: string,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): string {
    const caps = this.providerCapabilities[provider];

    if (description.length <= caps.maxDescriptionLength) {
      return description;
    }

    const truncated = description.substring(0, caps.maxDescriptionLength - 3) + '...';
    this.logger(
      `Description truncated from ${description.length} to ${caps.maxDescriptionLength} characters`,
      'warn'
    );

    return truncated;
  }

  /**
   * Convert properties to provider format
   * تحويل الخصائص إلى صيغة المزود
   */
  private convertProperties(
    properties: Record<string, PropertySchema>,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): Record<string, any> {
    const caps = this.providerCapabilities[provider];
    const converted: Record<string, any> = {};

    for (const [key, prop] of Object.entries(properties)) {
      const convertedProp: any = {
        type: prop.type,
        description: prop.description,
      };

      // Enum
      if (prop.enum && caps.supportsEnums) {
        convertedProp.enum = prop.enum;
      }

      // Array items
      if (prop.type === 'array' && prop.items) {
        convertedProp.items = this.convertPropertySchema(prop.items, provider);
      }

      // Nested object
      if (prop.type === 'object' && prop.properties) {
        convertedProp.properties = this.convertProperties(prop.properties, provider);
        if (prop.required) {
          convertedProp.required = prop.required;
        }
      }

      // Number constraints
      if (prop.type === 'number') {
        if (prop.minimum !== undefined) convertedProp.minimum = prop.minimum;
        if (prop.maximum !== undefined) convertedProp.maximum = prop.maximum;
      }

      // String constraints
      if (prop.type === 'string') {
        if (prop.minLength !== undefined) convertedProp.minLength = prop.minLength;
        if (prop.maxLength !== undefined) convertedProp.maxLength = prop.maxLength;
        if (prop.pattern) convertedProp.pattern = prop.pattern;
        if (prop.format) convertedProp.format = prop.format;
      }

      converted[key] = convertedProp;
    }

    return converted;
  }

  /**
   * Convert single property schema
   * تحويل مخطط خاصية واحدة
   */
  private convertPropertySchema(
    prop: PropertySchema,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): any {
    const converted: any = {
      type: prop.type,
      description: prop.description,
    };

    if (prop.type === 'object' && prop.properties) {
      converted.properties = this.convertProperties(prop.properties, provider);
      if (prop.required) converted.required = prop.required;
    }

    if (prop.type === 'array' && prop.items) {
      converted.items = this.convertPropertySchema(prop.items, provider);
    }

    return converted;
  }

  /**
   * Find unsupported types
   * إيجاد الأنواع غير المدعومة
   */
  private findUnsupportedTypes(
    properties: Record<string, PropertySchema>,
    caps: typeof this.providerCapabilities.claude
  ): string[] {
    const unsupported: string[] = [];

    for (const [key, prop] of Object.entries(properties)) {
      if (!caps.supportedTypes.includes(prop.type)) {
        unsupported.push(`${key}:${prop.type}`);
      }

      if (prop.type === 'object' && prop.properties) {
        const nested = this.findUnsupportedTypes(prop.properties, caps);
        unsupported.push(...nested);
      }
    }

    return unsupported;
  }

  /**
   * Check if has nullable properties
   * التحقق من وجود خصائص nullable
   */
  private hasNullableProperties(properties: Record<string, PropertySchema>): boolean {
    for (const prop of Object.values(properties)) {
      if (prop.nullable) return true;
      if (prop.type === 'object' && prop.properties) {
        if (this.hasNullableProperties(prop.properties)) return true;
      }
    }
    return false;
  }

  /**
   * Get maximum nesting depth
   * الحصول على أقصى عمق للتداخل
   */
  private getMaxNestingDepth(
    properties: Record<string, PropertySchema>,
    currentDepth: number = 0
  ): number {
    let maxDepth = currentDepth;

    for (const prop of Object.values(properties)) {
      if (prop.type === 'object' && prop.properties) {
        const depth = this.getMaxNestingDepth(prop.properties, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }

  // ============================================
  // 🔧 Optimization Methods
  // ============================================

  /**
   * Optimize tool for provider
   * تحسين الأداة للمزود
   */
  optimizeForProvider(
    tool: UnifiedTool,
    provider: 'claude' | 'openai' | 'gemini' | 'deepseek'
  ): UnifiedTool {
    this.logger(`Optimizing ${tool.name} for ${provider}`, 'debug');

    const caps = this.providerCapabilities[provider];
    const optimized: UnifiedTool = JSON.parse(JSON.stringify(tool)); // Deep clone

    // Optimize description
    if (optimized.description.length > caps.maxDescriptionLength) {
      optimized.description = this.smartTruncate(
        optimized.description,
        caps.maxDescriptionLength
      );
    }

    // Optimize properties
    optimized.inputSchema.properties = this.optimizeProperties(
      optimized.inputSchema.properties,
      caps
    );

    return optimized;
  }

  /**
   * Smart truncate description
   * اختصار ذكي للوصف
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;

    // Try to truncate at sentence boundary
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let truncated = '';

    for (const sentence of sentences) {
      if ((truncated + sentence).length > maxLength - 3) break;
      truncated += sentence;
    }

    if (truncated.length === 0) {
      // No sentence boundary found, truncate at word boundary
      truncated = text.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
    }

    return truncated.trim() + '...';
  }

  /**
   * Optimize properties recursively
   * تحسين الخصائص بشكل تكراري
   */
  private optimizeProperties(
    properties: Record<string, PropertySchema>,
    caps: typeof this.providerCapabilities.claude
  ): Record<string, PropertySchema> {
    const optimized: Record<string, PropertySchema> = {};

    for (const [key, prop] of Object.entries(properties)) {
      const optimizedProp = { ...prop };

      // Remove nullable if not supported
      if (!caps.supportsNullable && optimizedProp.nullable) {
        delete optimizedProp.nullable;
      }

      // Remove defaults if not supported
      if (!caps.supportsDefaults && optimizedProp.default !== undefined) {
        delete optimizedProp.default;
      }

      // Optimize nested objects
      if (optimizedProp.type === 'object' && optimizedProp.properties) {
        optimizedProp.properties = this.optimizeProperties(optimizedProp.properties, caps);
      }

      optimized[key] = optimizedProp;
    }

    return optimized;
  }

  // ============================================
  // 🧹 Cache Management
  // ============================================

  clearCache(): void {
    this.conversionCache.clear();
    this.validationCache.clear();
    this.logger('Cache cleared', 'info');
  }

  getCacheStats(): { conversions: number; validations: number } {
    return {
      conversions: this.conversionCache.size,
      validations: this.validationCache.size,
    };
  }
}

// ============================================
// 📤 Exports
// ============================================

export default ToolAdapter;
