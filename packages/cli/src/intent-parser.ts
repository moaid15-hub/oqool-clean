/**
 * Intent Parser System
 *
 * نظام متقدم لتحليل نوايا المستخدم من الأوامر النصية
 * يدعم:
 * - Multiple intent types
 * - Confidence scoring
 * - Entity extraction
 * - Multi-language support (English + Arabic)
 * - Context-aware parsing
 */

export type IntentType =
  | 'generate'      // إنشاء كود/ملفات جديدة
  | 'modify'        // تعديل كود موجود
  | 'explain'       // شرح وتوضيح
  | 'review'        // مراجعة الكود
  | 'debug'         // إصلاح الأخطاء
  | 'optimize'      // تحسين الأداء
  | 'test'          // إنشاء/تشغيل اختبارات
  | 'deploy'        // نشر ورفع
  | 'git'           // عمليات Git
  | 'file'          // عمليات الملفات
  | 'search'        // البحث
  | 'chat'          // محادثة عامة
  | 'unknown';      // غير معروف

/**
 * Entity types that can be extracted
 */
export interface ExtractedEntities {
  files?: string[];           // File paths mentioned
  languages?: string[];       // Programming languages
  frameworks?: string[];      // Frameworks/libraries
  actions?: string[];         // Specific actions
  technologies?: string[];    // Technologies mentioned
  locations?: string[];       // Directory paths
  numbers?: number[];         // Numbers mentioned
  urls?: string[];           // URLs
}

/**
 * Parsed intent result
 */
export interface ParsedIntent {
  type: IntentType;
  confidence: number;        // 0-1
  entities: ExtractedEntities;
  originalMessage: string;
  language: 'en' | 'ar' | 'mixed';
  subIntent?: string;        // More specific intent
  suggestions?: string[];    // Suggested follow-up actions
}

/**
 * Intent pattern definition
 */
interface IntentPattern {
  type: IntentType;
  patterns: RegExp[];
  keywords: string[];
  arabicKeywords?: string[];
  weight: number;
}

/**
 * Intent Parser Class
 */
export class IntentParser {
  private patterns: IntentPattern[] = [
    // Generate/Create patterns
    {
      type: 'generate',
      patterns: [
        /^(create|add|build|generate|make|new|write|implement)/i,
        /^(أنشئ|اصنع|اكتب|أضف|ولّد|اعمل)/,
      ],
      keywords: ['create', 'add', 'build', 'generate', 'make', 'new', 'write', 'implement'],
      arabicKeywords: ['أنشئ', 'اصنع', 'اكتب', 'أضف', 'ولّد', 'اعمل'],
      weight: 1.0,
    },

    // Modify/Update patterns
    {
      type: 'modify',
      patterns: [
        /^(update|change|fix|modify|edit|refactor|improve|enhance)/i,
        /^(عدّل|غيّر|صلّح|حسّن|طوّر)/,
      ],
      keywords: ['update', 'change', 'fix', 'modify', 'edit', 'refactor', 'improve', 'enhance'],
      arabicKeywords: ['عدّل', 'غيّر', 'صلّح', 'حسّن', 'طوّر'],
      weight: 1.0,
    },

    // Explain patterns
    {
      type: 'explain',
      patterns: [
        /^(explain|what|how|why|describe|tell|show|demonstrate)/i,
        /^(اشرح|ماذا|كيف|لماذا|وضّح|أخبرني)/,
        /\?$/,
      ],
      keywords: ['explain', 'what', 'how', 'why', 'describe', 'tell', 'show'],
      arabicKeywords: ['اشرح', 'ماذا', 'كيف', 'لماذا', 'وضّح', 'أخبرني'],
      weight: 0.9,
    },

    // Review patterns
    {
      type: 'review',
      patterns: [
        /^(review|check|analyze|inspect|audit|validate|verify)/i,
        /^(راجع|افحص|حلل|تحقق|دقق)/,
      ],
      keywords: ['review', 'check', 'analyze', 'inspect', 'audit', 'validate'],
      arabicKeywords: ['راجع', 'افحص', 'حلل', 'تحقق', 'دقق'],
      weight: 0.95,
    },

    // Debug patterns
    {
      type: 'debug',
      patterns: [
        /^(debug|fix|solve|resolve|troubleshoot)/i,
        /^(صحح|حل|أصلح)/,
        /(error|bug|issue|problem|broken|crash)/i,
      ],
      keywords: ['debug', 'fix', 'solve', 'error', 'bug', 'issue', 'problem'],
      arabicKeywords: ['صحح', 'حل', 'أصلح', 'خطأ', 'مشكلة'],
      weight: 1.0,
    },

    // Optimize patterns
    {
      type: 'optimize',
      patterns: [
        /^(optimize|improve|speed|performance|faster|efficient)/i,
        /^(حسّن|سرّع)/,
      ],
      keywords: ['optimize', 'improve', 'speed', 'performance', 'faster', 'efficient'],
      arabicKeywords: ['حسّن', 'سرّع', 'أداء'],
      weight: 0.9,
    },

    // Test patterns
    {
      type: 'test',
      patterns: [
        /^(test|run|execute|try)/i,
        /^(اختبر|شغّل|جرّب)/,
        /(unit test|integration test|e2e)/i,
      ],
      keywords: ['test', 'run', 'execute', 'try', 'testing'],
      arabicKeywords: ['اختبر', 'شغّل', 'جرّب', 'اختبار'],
      weight: 0.95,
    },

    // Deploy patterns
    {
      type: 'deploy',
      patterns: [
        /^(deploy|publish|release|launch|ship)/i,
        /^(انشر|ارفع|أطلق)/,
      ],
      keywords: ['deploy', 'publish', 'release', 'launch', 'ship'],
      arabicKeywords: ['انشر', 'ارفع', 'أطلق'],
      weight: 1.0,
    },

    // Git patterns
    {
      type: 'git',
      patterns: [
        /^git\s/i,
        /^(commit|push|pull|merge|branch|checkout)/i,
        /(git|github|repository|repo|version control)/i,
      ],
      keywords: ['git', 'commit', 'push', 'pull', 'merge', 'branch'],
      arabicKeywords: [],
      weight: 1.0,
    },

    // File patterns
    {
      type: 'file',
      patterns: [
        /^(open|read|write|delete|move|copy|rename)/i,
        /^(افتح|اقرأ|احذف|انقل|انسخ)/,
        /\.(ts|js|py|java|go|rs|md|json|yaml)(\s|$)/i,
      ],
      keywords: ['open', 'read', 'write', 'delete', 'move', 'copy', 'file'],
      arabicKeywords: ['افتح', 'اقرأ', 'احذف', 'انقل', 'ملف'],
      weight: 0.95,
    },

    // Search patterns
    {
      type: 'search',
      patterns: [
        /^(find|search|locate|look for|where)/i,
        /^(ابحث|أين|جد)/,
      ],
      keywords: ['find', 'search', 'locate', 'look', 'where'],
      arabicKeywords: ['ابحث', 'أين', 'جد'],
      weight: 0.9,
    },
  ];

  /**
   * Parse intent from message
   */
  parse(message: string): ParsedIntent {
    const originalMessage = message;
    const normalizedMessage = message.trim();

    // Detect language
    const language = this.detectLanguage(normalizedMessage);

    // Calculate scores for each intent
    const scores = new Map<IntentType, number>();

    for (const pattern of this.patterns) {
      let score = 0;

      // Check patterns
      for (const regex of pattern.patterns) {
        if (regex.test(normalizedMessage)) {
          score += pattern.weight;
          break;
        }
      }

      // Check keywords
      const keywords = language === 'ar' && pattern.arabicKeywords
        ? pattern.arabicKeywords
        : pattern.keywords;

      for (const keyword of keywords) {
        if (normalizedMessage.toLowerCase().includes(keyword.toLowerCase())) {
          score += 0.3;
        }
      }

      if (score > 0) {
        scores.set(pattern.type, score);
      }
    }

    // Find highest score
    let bestIntent: IntentType = 'chat';
    let maxScore = 0;

    for (const [intent, score] of scores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    // Normalize confidence (max 1.0)
    const confidence = Math.min(maxScore, 1.0);

    // Extract entities
    const entities = this.extractEntities(normalizedMessage);

    // Determine sub-intent
    const subIntent = this.determineSubIntent(bestIntent, normalizedMessage);

    // Generate suggestions
    const suggestions = this.generateSuggestions(bestIntent, entities);

    return {
      type: bestIntent,
      confidence,
      entities,
      originalMessage,
      language,
      subIntent,
      suggestions,
    };
  }

  /**
   * Detect message language
   */
  private detectLanguage(message: string): 'en' | 'ar' | 'mixed' {
    const arabicChars = message.match(/[\u0600-\u06FF]/g);
    const englishChars = message.match(/[a-zA-Z]/g);

    const arabicCount = arabicChars ? arabicChars.length : 0;
    const englishCount = englishChars ? englishChars.length : 0;

    if (arabicCount > 0 && englishCount > 0) {
      return 'mixed';
    } else if (arabicCount > englishCount) {
      return 'ar';
    } else {
      return 'en';
    }
  }

  /**
   * Extract entities from message
   */
  private extractEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract file paths
    const fileRegex = /(?:^|[\s"'])([./]?[\w-]+\/)*[\w-]+\.(ts|js|jsx|tsx|py|java|go|rs|md|json|yaml|yml|css|scss|html)(?:[\s"']|$)/gi;
    const files = [...message.matchAll(fileRegex)].map(m => m[0].trim().replace(/["']/g, ''));
    if (files.length > 0) {
      entities.files = files;
    }

    // Extract programming languages
    const langRegex = /\b(typescript|javascript|python|java|golang?|rust|ruby|php|c\+\+|swift)\b/gi;
    const languages = [...message.matchAll(langRegex)].map(m => m[0].toLowerCase());
    if (languages.length > 0) {
      entities.languages = [...new Set(languages)];
    }

    // Extract frameworks
    const frameworkRegex = /\b(react|vue|angular|express|django|flask|spring|laravel|rails)\b/gi;
    const frameworks = [...message.matchAll(frameworkRegex)].map(m => m[0].toLowerCase());
    if (frameworks.length > 0) {
      entities.frameworks = [...new Set(frameworks)];
    }

    // Extract directory paths
    const dirRegex = /(?:^|[\s"'])([./][\w-]+\/?)+(?:[\s"']|$)/g;
    const locations = [...message.matchAll(dirRegex)]
      .map(m => m[0].trim().replace(/["']/g, ''))
      .filter(l => !l.includes('.'));
    if (locations.length > 0) {
      entities.locations = [...new Set(locations)];
    }

    // Extract numbers
    const numberRegex = /\b\d+\b/g;
    const numbers = [...message.matchAll(numberRegex)].map(m => parseInt(m[0]));
    if (numbers.length > 0) {
      entities.numbers = numbers;
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = [...message.matchAll(urlRegex)].map(m => m[0]);
    if (urls.length > 0) {
      entities.urls = urls;
    }

    return entities;
  }

  /**
   * Determine more specific sub-intent
   */
  private determineSubIntent(intent: IntentType, message: string): string | undefined {
    const lowerMessage = message.toLowerCase();

    switch (intent) {
      case 'generate':
        if (lowerMessage.includes('component')) return 'generate_component';
        if (lowerMessage.includes('function')) return 'generate_function';
        if (lowerMessage.includes('class')) return 'generate_class';
        if (lowerMessage.includes('api')) return 'generate_api';
        if (lowerMessage.includes('test')) return 'generate_test';
        break;

      case 'modify':
        if (lowerMessage.includes('refactor')) return 'refactor';
        if (lowerMessage.includes('rename')) return 'rename';
        if (lowerMessage.includes('move')) return 'move';
        break;

      case 'git':
        if (lowerMessage.includes('commit')) return 'git_commit';
        if (lowerMessage.includes('push')) return 'git_push';
        if (lowerMessage.includes('pull')) return 'git_pull';
        if (lowerMessage.includes('merge')) return 'git_merge';
        break;

      case 'test':
        if (lowerMessage.includes('unit')) return 'unit_test';
        if (lowerMessage.includes('integration')) return 'integration_test';
        if (lowerMessage.includes('e2e')) return 'e2e_test';
        break;
    }

    return undefined;
  }

  /**
   * Generate suggestions based on intent
   */
  private generateSuggestions(intent: IntentType, entities: ExtractedEntities): string[] {
    const suggestions: string[] = [];

    switch (intent) {
      case 'generate':
        suggestions.push('Add tests for the generated code');
        suggestions.push('Review the generated code');
        if (!entities.files) {
          suggestions.push('Specify a file path to save the code');
        }
        break;

      case 'modify':
        suggestions.push('Review changes before applying');
        suggestions.push('Create a git commit for the changes');
        break;

      case 'debug':
        suggestions.push('Run tests to verify the fix');
        suggestions.push('Check for similar issues in other files');
        break;

      case 'test':
        suggestions.push('Check test coverage');
        suggestions.push('Review failing tests');
        break;

      case 'git':
        suggestions.push('Review changes before committing');
        suggestions.push('Run tests before pushing');
        break;
    }

    return suggestions;
  }

  /**
   * Get intent description in Arabic
   */
  getIntentDescriptionArabic(intent: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      generate: 'إنشاء كود جديد',
      modify: 'تعديل كود موجود',
      explain: 'شرح وتوضيح',
      review: 'مراجعة الكود',
      debug: 'إصلاح الأخطاء',
      optimize: 'تحسين الأداء',
      test: 'اختبار',
      deploy: 'نشر ورفع',
      git: 'عمليات Git',
      file: 'عمليات الملفات',
      search: 'بحث',
      chat: 'محادثة',
      unknown: 'غير معروف',
    };

    return descriptions[intent];
  }

  /**
   * Validate if intent is supported
   */
  isIntentSupported(intent: IntentType): boolean {
    return intent !== 'unknown';
  }
}

/**
 * Global intent parser instance
 */
export const intentParser = new IntentParser();

/**
 * Quick parse function
 */
export function parseIntent(message: string): ParsedIntent {
  return intentParser.parse(message);
}
