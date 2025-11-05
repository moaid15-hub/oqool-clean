// intelligent-predictor.ts
// ============================================
// 🔮 Intelligent Code Predictor - المتنبئ الذكي بالكود
// ============================================
// Advanced AI-powered code prediction system
// ============================================

import type { CodePattern, PredictionContext, CompletionSuggestion } from './ml-agent-enhanced.js';
import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

// ============================================
// 📊 Prediction Types
// ============================================

export interface PredictionResult {
  suggestions: CompletionSuggestion[];
  confidence: number;
  reasoning: string;
  alternatives: string[];
  contextAnalysis: ContextAnalysis;
  performance: {
    predictionTime: number;
    modelUsed: string;
    cacheHit: boolean;
  };
}

export interface ContextAnalysis {
  codeIntent: string;
  possiblePatterns: string[];
  requiredImports: string[];
  suggestedRefactoring: string[];
  securityConcerns: string[];
  performanceHints: string[];
}

export interface PredictionOptions {
  maxSuggestions?: number;
  includeExplanations?: boolean;
  usePatternHistory?: boolean;
  aggressiveness?: 'conservative' | 'balanced' | 'aggressive';
  contextWindow?: number;
}

// ============================================
// 🔮 Intelligent Predictor Class
// ============================================

export class IntelligentPredictor {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;
  private patternDatabase: Map<string, CodePattern>;
  private predictionHistory: PredictionHistory[];
  private performanceMetrics: PerformanceMetrics;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: 'deepseek', // Use DeepSeek for predictions (cost-effective)
    });

    this.provider = provider;
    this.patternDatabase = new Map();
    this.predictionHistory = [];
    this.performanceMetrics = {
      totalPredictions: 0,
      successfulPredictions: 0,
      averageTime: 0,
      cacheHitRate: 0,
    };
  }

  // ============================================
  // 🎯 Main Prediction Method
  // ============================================

  /**
   * Predict code completion with advanced context analysis
   */
  async predict(
    context: PredictionContext,
    options: PredictionOptions = {}
  ): Promise<PredictionResult> {
    const startTime = Date.now();

    try {
      // Set default options
      const opts = {
        maxSuggestions: options.maxSuggestions || 3,
        includeExplanations: options.includeExplanations ?? true,
        usePatternHistory: options.usePatternHistory ?? true,
        aggressiveness: options.aggressiveness || 'balanced',
        contextWindow: options.contextWindow || 10,
      };

      // Analyze context deeply
      const contextAnalysis = await this.analyzeContext(context, opts);

      // Find relevant patterns
      const relevantPatterns = opts.usePatternHistory
        ? this.findRelevantPatterns(context, contextAnalysis)
        : [];

      // Generate suggestions using AI
      const suggestions = await this.generateSuggestions(
        context,
        contextAnalysis,
        relevantPatterns,
        opts
      );

      // Calculate confidence
      const confidence = this.calculateConfidence(suggestions, relevantPatterns);

      // Generate alternatives
      const alternatives = this.generateAlternatives(context, suggestions);

      // Update metrics
      const predictionTime = Date.now() - startTime;
      this.updateMetrics(predictionTime, suggestions.length > 0);

      // Record in history
      this.recordPrediction({
        context,
        suggestions,
        timestamp: Date.now(),
        accepted: false, // Will be updated later
      });

      return {
        suggestions,
        confidence,
        reasoning: contextAnalysis.codeIntent,
        alternatives,
        contextAnalysis,
        performance: {
          predictionTime,
          modelUsed: this.provider,
          cacheHit: false,
        },
      };
    } catch (error) {
      console.error('❌ فشل التنبؤ:', error);
      throw error;
    }
  }

  // ============================================
  // 🧠 Context Analysis
  // ============================================

  /**
   * Deeply analyze code context
   */
  private async analyzeContext(
    context: PredictionContext,
    options: PredictionOptions
  ): Promise<ContextAnalysis> {
    const prompt = `
أنت محلل كود خبير. قم بتحليل السياق التالي بعمق:

**معلومات الملف:**
- اللغة: ${context.language}
- الإطار: ${context.framework || 'غير محدد'}
- الملف: ${context.currentFile}

**الأسطر السابقة (${options.contextWindow} سطر):**
\`\`\`${context.language}
${context.previousLines.slice(-options.contextWindow!).join('\n')}
\`\`\`

**السطر الحالي:**
\`\`\`${context.language}
${context.currentLine}
\`\`\`

${
  context.nextLines
    ? `
**الأسطر التالية:**
\`\`\`${context.language}
${context.nextLines.join('\n')}
\`\`\`
`
    : ''
}

قم بتحليل:

1. **نية المبرمج (Code Intent):**
   - ماذا يحاول المبرمج أن يفعل؟
   - ما الهدف من هذا الكود؟

2. **الأنماط المحتملة (Possible Patterns):**
   - أي أنماط تصميم قد تكون مناسبة؟
   - هل هناك أنماط شائعة في هذا السياق؟

3. **الواردات المطلوبة (Required Imports):**
   - ما المكتبات/الوحدات التي قد نحتاجها؟

4. **اقتراحات إعادة الهيكلة (Suggested Refactoring):**
   - هل يمكن تحسين الكود الحالي؟

5. **مخاوف أمنية (Security Concerns):**
   - هل هناك مشاكل أمنية محتملة؟

6. **تلميحات الأداء (Performance Hints):**
   - كيف يمكن تحسين الأداء؟

أعط النتيجة بصيغة JSON:
\`\`\`json
{
  "codeIntent": "...",
  "possiblePatterns": ["pattern1", "pattern2"],
  "requiredImports": ["import1", "import2"],
  "suggestedRefactoring": ["suggestion1", "suggestion2"],
  "securityConcerns": ["concern1", "concern2"],
  "performanceHints": ["hint1", "hint2"]
}
\`\`\`
`;

    try {
      const response = await this.callAI(prompt);
      return this.parseContextAnalysis(response);
    } catch (error) {
      console.error('فشل تحليل السياق:', error);
      return this.getDefaultContextAnalysis();
    }
  }

  // ============================================
  // 💡 Suggestion Generation
  // ============================================

  /**
   * Generate intelligent code suggestions
   */
  private async generateSuggestions(
    context: PredictionContext,
    analysis: ContextAnalysis,
    patterns: CodePattern[],
    options: PredictionOptions
  ): Promise<CompletionSuggestion[]> {
    const aggressivenessPrompts = {
      conservative: 'قدم اقتراحات آمنة ومجربة فقط',
      balanced: 'قدم توازن بين الاقتراحات الآمنة والمبتكرة',
      aggressive: 'كن مبدعاً وقدم اقتراحات متقدمة',
    };

    const prompt = `
أنت مساعد برمجة ذكي متخصص في إكمال الكود بدقة عالية.

**السياق:**
${JSON.stringify(context, null, 2)}

**التحليل:**
${JSON.stringify(analysis, null, 2)}

${
  patterns.length > 0
    ? `
**الأنماط ذات الصلة:**
${patterns.map((p, i) => `${i + 1}. ${p.pattern}: ${p.description}`).join('\n')}
`
    : ''
}

**الأسلوب:** ${aggressivenessPrompts[options.aggressiveness!]}

قدم ${options.maxSuggestions} اقتراحات لإكمال الكود:

لكل اقتراح، قدم:
- **الكود:** الكود المقترح كاملاً
- **الثقة:** مستوى الثقة (0-1)
- **النوع:** snippet/line/block/function
- **السبب:** لماذا هذا الاقتراح مناسب؟
- **الأنماط:** الأنماط المستخدمة

${options.includeExplanations ? '- **الشرح:** شرح تفصيلي للكود' : ''}

صيغة JSON:
\`\`\`json
[
  {
    "text": "// الكود المقترح هنا",
    "confidence": 0.9,
    "type": "line",
    "reasoning": "السبب...",
    "relatedPatterns": ["pattern1"],
    "explanation": "الشرح..."
  }
]
\`\`\`
`;

    try {
      const response = await this.callAI(prompt);
      return this.parseSuggestions(response);
    } catch (error) {
      console.error('فشل توليد الاقتراحات:', error);
      return [];
    }
  }

  // ============================================
  // 🔍 Pattern Matching
  // ============================================

  /**
   * Find patterns relevant to current context
   */
  private findRelevantPatterns(
    context: PredictionContext,
    analysis: ContextAnalysis
  ): CodePattern[] {
    const relevant: CodePattern[] = [];

    for (const pattern of this.patternDatabase.values()) {
      // Language match
      if (pattern.metadata.language !== context.language) continue;

      // Framework match
      if (context.framework && pattern.metadata.framework !== context.framework) {
        continue;
      }

      // Pattern name match with analysis
      const patternMatches = analysis.possiblePatterns.some((p) =>
        p.toLowerCase().includes(pattern.pattern.toLowerCase())
      );

      if (patternMatches) {
        relevant.push(pattern);
      }

      // Success rate threshold
      if (pattern.successRate > 0.7) {
        relevant.push(pattern);
      }
    }

    // Sort by relevance
    return relevant
      .sort((a, b) => {
        const scoreA = a.successRate * a.frequency;
        const scoreB = b.successRate * b.frequency;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  // ============================================
  // 🎲 Alternative Generation
  // ============================================

  /**
   * Generate alternative approaches
   */
  private generateAlternatives(
    context: PredictionContext,
    suggestions: CompletionSuggestion[]
  ): string[] {
    const alternatives: string[] = [];

    // Language-specific alternatives
    switch (context.language.toLowerCase()) {
      case 'javascript':
      case 'typescript':
        alternatives.push('استخدام async/await بدلاً من Promises');
        alternatives.push('استخدام Destructuring للتبسيط');
        alternatives.push('استخدام Optional Chaining للأمان');
        break;

      case 'python':
        alternatives.push('استخدام List Comprehension');
        alternatives.push('استخدام Context Manager');
        alternatives.push('استخدام Type Hints');
        break;

      case 'java':
        alternatives.push('استخدام Streams API');
        alternatives.push('استخدام Optional للتعامل مع null');
        alternatives.push('استخدام Lambda Expressions');
        break;

      case 'go':
        alternatives.push('استخدام Goroutines للتوازي');
        alternatives.push('استخدام Channels للتواصل');
        alternatives.push('استخدام defer للتنظيف');
        break;
    }

    return alternatives.slice(0, 3);
  }

  // ============================================
  // 📊 Confidence Calculation
  // ============================================

  /**
   * Calculate overall prediction confidence
   */
  private calculateConfidence(
    suggestions: CompletionSuggestion[],
    patterns: CodePattern[]
  ): number {
    if (suggestions.length === 0) return 0;

    // Base confidence from suggestions
    const avgSuggestionConfidence =
      suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length;

    // Pattern match boost
    const patternBoost = patterns.length > 0 ? 0.1 : 0;

    // History boost (if similar predictions were successful before)
    const historyBoost = this.calculateHistoryBoost(suggestions);

    return Math.min(1, avgSuggestionConfidence + patternBoost + historyBoost);
  }

  /**
   * Calculate boost from prediction history
   */
  private calculateHistoryBoost(suggestions: CompletionSuggestion[]): number {
    if (this.predictionHistory.length === 0) return 0;

    const recentSuccess = this.predictionHistory.slice(-20).filter((h) => h.accepted).length;

    return Math.min(0.15, (recentSuccess / 20) * 0.15);
  }

  // ============================================
  // 💾 Pattern Management
  // ============================================

  /**
   * Add pattern to database
   */
  addPattern(pattern: CodePattern): void {
    this.patternDatabase.set(pattern.id, pattern);
  }

  /**
   * Load patterns from array
   */
  loadPatterns(patterns: CodePattern[]): void {
    for (const pattern of patterns) {
      this.patternDatabase.set(pattern.id, pattern);
    }
  }

  /**
   * Clear pattern database
   */
  clearPatterns(): void {
    this.patternDatabase.clear();
  }

  // ============================================
  // 📈 Metrics & History
  // ============================================

  /**
   * Record prediction in history
   */
  private recordPrediction(prediction: PredictionHistory): void {
    this.predictionHistory.push(prediction);

    // Keep only last 1000 predictions
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory = this.predictionHistory.slice(-1000);
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(predictionTime: number, success: boolean): void {
    this.performanceMetrics.totalPredictions++;

    if (success) {
      this.performanceMetrics.successfulPredictions++;
    }

    // Update average time
    const total = this.performanceMetrics.totalPredictions;
    const oldAvg = this.performanceMetrics.averageTime;
    this.performanceMetrics.averageTime = (oldAvg * (total - 1) + predictionTime) / total;
  }

  /**
   * Mark prediction as accepted/rejected
   */
  markPrediction(index: number, accepted: boolean): void {
    if (index >= 0 && index < this.predictionHistory.length) {
      this.predictionHistory[index].accepted = accepted;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get prediction history
   */
  getHistory(limit: number = 50): PredictionHistory[] {
    return this.predictionHistory.slice(-limit);
  }

  // ============================================
  // 🛠️ Helper Methods
  // ============================================

  private parseContextAnalysis(response: string): ContextAnalysis {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return this.getDefaultContextAnalysis();
    } catch (error) {
      return this.getDefaultContextAnalysis();
    }
  }

  private parseSuggestions(response: string): CompletionSuggestion[] {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error('فشل تحليل الاقتراحات:', error);
      return [];
    }
  }

  private getDefaultContextAnalysis(): ContextAnalysis {
    return {
      codeIntent: 'غير محدد',
      possiblePatterns: [],
      requiredImports: [],
      suggestedRefactoring: [],
      securityConcerns: [],
      performanceHints: [],
    };
  }

  private async callAI(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'coder',
      prompt,
      undefined,
      this.provider
    );
    return result.response;
  }
}

// ============================================
// 📊 Supporting Types
// ============================================

interface PredictionHistory {
  context: PredictionContext;
  suggestions: CompletionSuggestion[];
  timestamp: number;
  accepted: boolean;
}

interface PerformanceMetrics {
  totalPredictions: number;
  successfulPredictions: number;
  averageTime: number;
  cacheHitRate: number;
}

// ============================================
// 🏭 Factory
// ============================================

export function createIntelligentPredictor(
  config: { deepseek?: string; claude?: string; openai?: string },
  provider: AIProvider = 'auto'
): IntelligentPredictor {
  return new IntelligentPredictor(config, provider);
}

// ============================================
// Export (Already exported via export interface/class above)
// ============================================
