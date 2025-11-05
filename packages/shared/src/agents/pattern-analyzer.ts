// pattern-analyzer.ts
// ============================================
// 🔬 Advanced Pattern Analyzer - محلل الأنماط المتقدم
// ============================================
// Deep code analysis and pattern recognition system
// ============================================

import type { CodeFile } from '../core/god-mode.js';
import type { CodePattern, CodeContext, PatternType } from './ml-agent-enhanced.js';
import crypto from 'crypto';

// ============================================
// 📊 Analysis Types
// ============================================

export interface PatternAnalysis {
  patterns: CodePattern[];
  statistics: {
    totalPatterns: number;
    byType: Record<PatternType, number>;
    byLanguage: Record<string, number>;
    complexity: {
      min: number;
      max: number;
      avg: number;
    };
    quality: {
      bestPractices: number;
      antiPatterns: number;
      codeSmells: number;
    };
  };
  recommendations: string[];
  insights: string[];
}

export interface DesignPattern {
  name: string;
  category: 'creational' | 'structural' | 'behavioral';
  description: string;
  confidence: number;
  locations: Array<{ file: string; line: number }>;
  implementation: string;
}

export interface ArchitecturalPattern {
  name: string;
  type: 'mvc' | 'mvvm' | 'layered' | 'microservices' | 'event-driven' | 'hexagonal' | 'other';
  confidence: number;
  components: string[];
  relationships: Array<{ from: string; to: string; type: string }>;
}

export interface CodeMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: {
    score: number;
    issues: string[];
    estimatedHours: number;
  };
}

// ============================================
// 🔬 Pattern Analyzer Class
// ============================================

export class PatternAnalyzer {
  /**
   * Analyze codebase for all pattern types
   */
  static async analyzeCodebase(codeBase: CodeFile[]): Promise<PatternAnalysis> {
    const patterns: CodePattern[] = [];
    const recommendations: string[] = [];
    const insights: string[] = [];

    // Analyze each file
    for (const file of codeBase) {
      const filePatterns = await this.analyzeFile(file);
      patterns.push(...filePatterns);
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(patterns);

    // Generate recommendations
    recommendations.push(...this.generateRecommendations(patterns, statistics));

    // Generate insights
    insights.push(...this.generateInsights(patterns, codeBase));

    return {
      patterns,
      statistics,
      recommendations,
      insights,
    };
  }

  /**
   * Analyze single file for patterns
   */
  static async analyzeFile(file: CodeFile): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    // Extract different types of patterns
    patterns.push(...this.extractDesignPatterns(file));
    patterns.push(...this.extractAlgorithmicPatterns(file));
    patterns.push(...this.extractIdiomaticPatterns(file));
    patterns.push(...this.extractBestPractices(file));
    patterns.push(...this.detectAntiPatterns(file));

    return patterns;
  }

  /**
   * Extract design patterns (Singleton, Factory, Observer, etc.)
   */
  private static extractDesignPatterns(file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const content = file.content.toLowerCase();

    // Singleton Pattern
    if (this.matchesSingletonPattern(file.content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Singleton',
          type: 'design-pattern',
          description: 'نمط Singleton - يضمن وجود نسخة واحدة فقط من الكلاس',
          complexity: 4,
          context: this.createContext(file),
          examples: [this.extractSingletonExample(file.content)],
        })
      );
    }

    // Factory Pattern
    if (this.matchesFactoryPattern(file.content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Factory',
          type: 'design-pattern',
          description: 'نمط Factory - ينشئ الكائنات دون تحديد النوع الدقيق',
          complexity: 5,
          context: this.createContext(file),
          examples: [this.extractFactoryExample(file.content)],
        })
      );
    }

    // Observer Pattern
    if (this.matchesObserverPattern(file.content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Observer',
          type: 'design-pattern',
          description: 'نمط Observer - يسمح للكائنات بمراقبة تغييرات الكائنات الأخرى',
          complexity: 6,
          context: this.createContext(file),
          examples: [this.extractObserverExample(file.content)],
        })
      );
    }

    // Strategy Pattern
    if (this.matchesStrategyPattern(file.content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Strategy',
          type: 'design-pattern',
          description: 'نمط Strategy - يحدد عائلة من الخوارزميات ويجعلها قابلة للتبديل',
          complexity: 5,
          context: this.createContext(file),
          examples: [this.extractStrategyExample(file.content)],
        })
      );
    }

    // Decorator Pattern
    if (this.matchesDecoratorPattern(file.content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Decorator',
          type: 'design-pattern',
          description: 'نمط Decorator - يضيف وظائف جديدة للكائنات بشكل ديناميكي',
          complexity: 6,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract algorithmic patterns
   */
  private static extractAlgorithmicPatterns(file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const content = file.content;

    // Sorting algorithms
    if (
      content.includes('sort(') ||
      content.includes('quicksort') ||
      content.includes('mergesort')
    ) {
      patterns.push(
        this.createPattern({
          pattern: 'Sorting Algorithm',
          type: 'algorithm',
          description: 'خوارزمية ترتيب البيانات',
          complexity: 5,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Search algorithms
    if (
      content.includes('binarySearch') ||
      content.includes('find(') ||
      content.includes('search(')
    ) {
      patterns.push(
        this.createPattern({
          pattern: 'Search Algorithm',
          type: 'algorithm',
          description: 'خوارزمية البحث في البيانات',
          complexity: 4,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Recursive patterns
    if (this.hasRecursion(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Recursion',
          type: 'algorithm',
          description: 'استخدام التكرار (Recursion) لحل المشاكل',
          complexity: 7,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Dynamic Programming
    if (this.matchesDynamicProgramming(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Dynamic Programming',
          type: 'algorithm',
          description: 'البرمجة الديناميكية لتحسين الأداء',
          complexity: 8,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract idiomatic patterns (language-specific best practices)
   */
  private static extractIdiomaticPatterns(file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const lang = file.language.toLowerCase();
    const content = file.content;

    switch (lang) {
      case 'javascript':
      case 'typescript':
        patterns.push(...this.extractJavaScriptIdioms(content, file));
        break;
      case 'python':
        patterns.push(...this.extractPythonIdioms(content, file));
        break;
      case 'java':
        patterns.push(...this.extractJavaIdioms(content, file));
        break;
      case 'go':
        patterns.push(...this.extractGoIdioms(content, file));
        break;
    }

    return patterns;
  }

  /**
   * Extract JavaScript/TypeScript idioms
   */
  private static extractJavaScriptIdioms(content: string, file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Async/Await pattern
    if (content.includes('async') && content.includes('await')) {
      patterns.push(
        this.createPattern({
          pattern: 'Async/Await',
          type: 'idiom',
          description: 'استخدام async/await للعمليات غير المتزامنة',
          complexity: 4,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Promise pattern
    if (content.includes('Promise') || content.includes('.then(')) {
      patterns.push(
        this.createPattern({
          pattern: 'Promises',
          type: 'idiom',
          description: 'استخدام Promises لإدارة العمليات غير المتزامنة',
          complexity: 5,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Destructuring
    if (content.includes('const {') || content.includes('const [')) {
      patterns.push(
        this.createPattern({
          pattern: 'Destructuring',
          type: 'idiom',
          description: 'استخدام Destructuring لاستخراج القيم',
          complexity: 3,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Arrow functions
    if (content.includes('=>')) {
      patterns.push(
        this.createPattern({
          pattern: 'Arrow Functions',
          type: 'idiom',
          description: 'استخدام Arrow Functions',
          complexity: 2,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Optional chaining
    if (content.includes('?.')) {
      patterns.push(
        this.createPattern({
          pattern: 'Optional Chaining',
          type: 'idiom',
          description: 'استخدام Optional Chaining للوصول الآمن',
          complexity: 3,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract Python idioms
   */
  private static extractPythonIdioms(content: string, file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];

    // List comprehensions
    if (content.match(/\[.*for.*in.*\]/)) {
      patterns.push(
        this.createPattern({
          pattern: 'List Comprehension',
          type: 'idiom',
          description: 'استخدام List Comprehension',
          complexity: 4,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Context managers
    if (content.includes('with ') && content.includes(':')) {
      patterns.push(
        this.createPattern({
          pattern: 'Context Manager',
          type: 'idiom',
          description: 'استخدام Context Manager (with statement)',
          complexity: 4,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Decorators
    if (content.includes('@')) {
      patterns.push(
        this.createPattern({
          pattern: 'Decorators',
          type: 'idiom',
          description: 'استخدام Decorators',
          complexity: 6,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract Java idioms
   */
  private static extractJavaIdioms(content: string, file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Builder pattern
    if (content.includes('.builder()')) {
      patterns.push(
        this.createPattern({
          pattern: 'Builder Pattern',
          type: 'idiom',
          description: 'استخدام Builder Pattern',
          complexity: 5,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Streams
    if (content.includes('.stream()')) {
      patterns.push(
        this.createPattern({
          pattern: 'Java Streams',
          type: 'idiom',
          description: 'استخدام Java Streams API',
          complexity: 6,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract Go idioms
   */
  private static extractGoIdioms(content: string, file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Goroutines
    if (content.includes('go ')) {
      patterns.push(
        this.createPattern({
          pattern: 'Goroutines',
          type: 'idiom',
          description: 'استخدام Goroutines للتوازي',
          complexity: 7,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Channels
    if (content.includes('chan ') || content.includes('<-')) {
      patterns.push(
        this.createPattern({
          pattern: 'Channels',
          type: 'idiom',
          description: 'استخدام Channels للتواصل بين Goroutines',
          complexity: 7,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Extract best practices
   */
  private static extractBestPractices(file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const content = file.content;

    // Error handling
    if (content.includes('try') && content.includes('catch')) {
      patterns.push(
        this.createPattern({
          pattern: 'Error Handling',
          type: 'best-practice',
          description: 'معالجة الأخطاء بشكل صحيح',
          complexity: 4,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Input validation
    if (content.includes('validate') || content.includes('isValid')) {
      patterns.push(
        this.createPattern({
          pattern: 'Input Validation',
          type: 'best-practice',
          description: 'التحقق من صحة المدخلات',
          complexity: 3,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Logging
    if (content.includes('console.log') || content.includes('logger') || content.includes('log.')) {
      patterns.push(
        this.createPattern({
          pattern: 'Logging',
          type: 'best-practice',
          description: 'تسجيل الأحداث والأخطاء',
          complexity: 2,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Documentation
    if (content.includes('/**') || content.includes('///')) {
      patterns.push(
        this.createPattern({
          pattern: 'Documentation',
          type: 'best-practice',
          description: 'توثيق الكود',
          complexity: 2,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  /**
   * Detect anti-patterns
   */
  private static detectAntiPatterns(file: CodeFile): CodePattern[] {
    const patterns: CodePattern[] = [];
    const content = file.content;

    // God Object
    if (this.isGodObject(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'God Object',
          type: 'anti-pattern',
          description: 'كلاس يحتوي على الكثير من المسؤوليات',
          complexity: 8,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Magic Numbers
    if (this.hasMagicNumbers(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Magic Numbers',
          type: 'anti-pattern',
          description: 'استخدام أرقام غير موضحة في الكود',
          complexity: 2,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Callback Hell
    if (this.hasCallbackHell(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Callback Hell',
          type: 'anti-pattern',
          description: 'تداخل عميق للـ callbacks',
          complexity: 7,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    // Spaghetti Code
    if (this.isSpaghettiCode(content)) {
      patterns.push(
        this.createPattern({
          pattern: 'Spaghetti Code',
          type: 'anti-pattern',
          description: 'كود غير منظم وصعب القراءة',
          complexity: 9,
          context: this.createContext(file),
          examples: [],
        })
      );
    }

    return patterns;
  }

  // ============================================
  // Pattern Matching Helpers
  // ============================================

  private static matchesSingletonPattern(content: string): boolean {
    return (
      content.includes('private constructor') ||
      content.includes('private static instance') ||
      content.includes('getInstance()')
    );
  }

  private static matchesFactoryPattern(content: string): boolean {
    return (
      content.includes('create') && (content.includes('Factory') || content.includes('Builder'))
    );
  }

  private static matchesObserverPattern(content: string): boolean {
    return (
      (content.includes('subscribe') && content.includes('notify')) ||
      content.includes('addEventListener') ||
      content.includes('on(')
    );
  }

  private static matchesStrategyPattern(content: string): boolean {
    return (
      (content.includes('interface') && content.includes('strategy')) ||
      content.includes('algorithm')
    );
  }

  private static matchesDecoratorPattern(content: string): boolean {
    return (
      content.includes('@') || // Decorators in TypeScript/Python
      (content.includes('wrap') && content.includes('component'))
    );
  }

  private static hasRecursion(content: string): boolean {
    // Simple check for recursive function calls
    const functionPattern = /function\s+(\w+)|const\s+(\w+)\s*=/g;
    const functions: string[] = [];
    let match;

    while ((match = functionPattern.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }

    for (const func of functions) {
      const funcBody = this.extractFunctionBody(content, func);
      if (funcBody && funcBody.includes(func + '(')) {
        return true;
      }
    }

    return false;
  }

  private static matchesDynamicProgramming(content: string): boolean {
    return (
      content.includes('memo') ||
      content.includes('dp[') ||
      (content.includes('cache') && content.includes('subproblem'))
    );
  }

  private static isGodObject(content: string): boolean {
    const methodCount = (content.match(/function |def |func /g) || []).length;
    const lineCount = content.split('\n').length;
    return methodCount > 20 || lineCount > 500;
  }

  private static hasMagicNumbers(content: string): boolean {
    const numberPattern = /\b\d{2,}\b/g;
    const matches = content.match(numberPattern) || [];
    return matches.length > 5;
  }

  private static hasCallbackHell(content: string): boolean {
    const callbackDepth = (content.match(/function\s*\([^)]*\)\s*{/g) || []).length;
    return callbackDepth > 4;
  }

  private static isSpaghettiCode(content: string): boolean {
    const gotoCount = (content.match(/goto /g) || []).length;
    const nestedLoops = (content.match(/for|while/g) || []).length;
    return gotoCount > 0 || nestedLoops > 5;
  }

  // ============================================
  // Statistics Calculation
  // ============================================

  private static calculateStatistics(patterns: CodePattern[]): PatternAnalysis['statistics'] {
    const byType: Partial<Record<PatternType, number>> = {};
    const byLanguage: Record<string, number> = {};
    let complexitySum = 0;
    let minComplexity = Infinity;
    let maxComplexity = 0;
    let bestPractices = 0;
    let antiPatterns = 0;
    let codeSmells = 0;

    for (const pattern of patterns) {
      // Count by type
      byType[pattern.type] = (byType[pattern.type] || 0) + 1;

      // Count by language
      const lang = pattern.context.language;
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;

      // Complexity stats
      complexitySum += pattern.complexity;
      minComplexity = Math.min(minComplexity, pattern.complexity);
      maxComplexity = Math.max(maxComplexity, pattern.complexity);

      // Quality stats
      if (pattern.type === 'best-practice') bestPractices++;
      if (pattern.type === 'anti-pattern') antiPatterns++;
      if (pattern.type === 'code-smell') codeSmells++;
    }

    return {
      totalPatterns: patterns.length,
      byType: byType as Record<PatternType, number>,
      byLanguage,
      complexity: {
        min: minComplexity === Infinity ? 0 : minComplexity,
        max: maxComplexity,
        avg: patterns.length > 0 ? complexitySum / patterns.length : 0,
      },
      quality: {
        bestPractices,
        antiPatterns,
        codeSmells,
      },
    };
  }

  // ============================================
  // Recommendations Generation
  // ============================================

  private static generateRecommendations(
    patterns: CodePattern[],
    statistics: PatternAnalysis['statistics']
  ): string[] {
    const recommendations: string[] = [];

    // Check for anti-patterns
    if (statistics.quality.antiPatterns > 0) {
      recommendations.push(
        `⚠️ تم العثور على ${statistics.quality.antiPatterns} نمط سيء (anti-pattern) - يُنصح بإعادة الهيكلة`
      );
    }

    // Check complexity
    if (statistics.complexity.avg > 7) {
      recommendations.push(
        `📊 متوسط التعقيد مرتفع (${statistics.complexity.avg.toFixed(1)}) - فكر في تبسيط الكود`
      );
    }

    // Check best practices
    const totalPatterns = statistics.totalPatterns;
    const bestPracticeRatio = statistics.quality.bestPractices / totalPatterns;

    if (bestPracticeRatio < 0.3) {
      recommendations.push('✨ يمكن تحسين الكود باتباع المزيد من أفضل الممارسات');
    }

    // Language-specific recommendations
    for (const [lang, count] of Object.entries(statistics.byLanguage)) {
      if (count > totalPatterns * 0.5) {
        recommendations.push(`🔧 معظم الكود بلغة ${lang} - تأكد من اتباع معايير ${lang} القياسية`);
      }
    }

    return recommendations;
  }

  // ============================================
  // Insights Generation
  // ============================================

  private static generateInsights(patterns: CodePattern[], codeBase: CodeFile[]): string[] {
    const insights: string[] = [];

    // Design pattern usage
    const designPatterns = patterns.filter((p) => p.type === 'design-pattern');
    if (designPatterns.length > 0) {
      insights.push(
        `🎨 يستخدم الكود ${designPatterns.length} نمط تصميم - مما يدل على بنية معمارية جيدة`
      );
    }

    // Code quality
    const qualityScore = this.calculateQualityScore(patterns);
    insights.push(`⭐ مستوى جودة الكود: ${qualityScore.toFixed(0)}%`);

    // Complexity distribution
    const highComplexityPatterns = patterns.filter((p) => p.complexity > 7);
    if (highComplexityPatterns.length > 0) {
      insights.push(`🔍 ${highComplexityPatterns.length} نمط معقد - قد يحتاج إلى مراجعة إضافية`);
    }

    return insights;
  }

  private static calculateQualityScore(patterns: CodePattern[]): number {
    if (patterns.length === 0) return 0;

    const bestPractices = patterns.filter((p) => p.type === 'best-practice').length;
    const antiPatterns = patterns.filter((p) => p.type === 'anti-pattern').length;
    const designPatterns = patterns.filter((p) => p.type === 'design-pattern').length;

    const score = (bestPractices * 2 + designPatterns * 3 - antiPatterns * 5) / patterns.length;

    return Math.max(0, Math.min(100, 50 + score * 10));
  }

  // ============================================
  // Helper Methods
  // ============================================

  private static createPattern(data: Partial<CodePattern>): CodePattern {
    return {
      id: this.generateId(),
      pattern: data.pattern || 'unknown',
      frequency: data.frequency || 1,
      context: data.context || this.createContext(),
      type: data.type || 'best-practice',
      description: data.description || '',
      complexity: data.complexity || 5,
      successRate: 0.8,
      lastUsed: Date.now(),
      examples: data.examples || [],
      metadata: {
        language: data.context?.language || 'unknown',
        framework: data.context?.framework,
        tags: [],
      },
    };
  }

  private static createContext(file?: CodeFile): CodeContext {
    return {
      language: file?.language || 'unknown',
      fileType: file ? file.path.split('.').pop() : undefined,
      scope: 'global',
    };
  }

  private static generateId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private static extractSingletonExample(content: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('getInstance')) {
        return lines.slice(Math.max(0, i - 3), i + 4).join('\n');
      }
    }
    return '';
  }

  private static extractFactoryExample(content: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('create') && lines[i].includes('Factory')) {
        return lines.slice(Math.max(0, i - 2), i + 3).join('\n');
      }
    }
    return '';
  }

  private static extractObserverExample(content: string): string {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('subscribe') || lines[i].includes('notify')) {
        return lines.slice(Math.max(0, i - 2), i + 3).join('\n');
      }
    }
    return '';
  }

  private static extractStrategyExample(content: string): string {
    return '';
  }

  private static extractFunctionBody(content: string, functionName: string): string | null {
    const pattern = new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*{([^}]*)}`, 's');
    const match = content.match(pattern);
    return match ? match[1] : null;
  }

  /**
   * Calculate code metrics
   */
  static calculateMetrics(file: CodeFile): CodeMetrics {
    const content = file.content;
    const lines = content.split('\n');

    return {
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      cognitiveComplexity: this.calculateCognitiveComplexity(content),
      linesOfCode: lines.filter((l) => l.trim().length > 0).length,
      maintainabilityIndex: this.calculateMaintainabilityIndex(content),
      technicalDebt: this.estimateTechnicalDebt(content),
    };
  }

  private static calculateCyclomaticComplexity(content: string): number {
    const decisionPoints = (content.match(/if|else|for|while|case|catch|\?|\&\&|\|\|/g) || [])
      .length;
    return decisionPoints + 1;
  }

  private static calculateCognitiveComplexity(content: string): number {
    let complexity = 0;
    let nestingLevel = 0;

    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('if') || line.includes('for') || line.includes('while')) {
        complexity += 1 + nestingLevel;
        nestingLevel++;
      }
      if (line.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
    }

    return complexity;
  }

  private static calculateMaintainabilityIndex(content: string): number {
    const volume = content.length;
    const complexity = this.calculateCyclomaticComplexity(content);
    const linesOfCode = content.split('\n').length;

    // Simplified maintainability index calculation
    const mi = Math.max(
      0,
      ((171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)) * 100) /
        171
    );

    return Math.round(mi);
  }

  private static estimateTechnicalDebt(content: string): CodeMetrics['technicalDebt'] {
    const issues: string[] = [];
    let score = 0;

    // Check for TODOs
    const todos = (content.match(/TODO|FIXME|HACK/g) || []).length;
    if (todos > 0) {
      issues.push(`${todos} TODO/FIXME comments`);
      score += todos * 2;
    }

    // Check for code smells
    if (this.hasMagicNumbers(content)) {
      issues.push('Magic numbers detected');
      score += 5;
    }

    if (this.hasCallbackHell(content)) {
      issues.push('Callback hell detected');
      score += 10;
    }

    // Estimate hours needed
    const estimatedHours = Math.ceil(score / 5);

    return {
      score,
      issues,
      estimatedHours,
    };
  }
}

// ============================================
// Export (Already exported via export interface/class above)
// ============================================
