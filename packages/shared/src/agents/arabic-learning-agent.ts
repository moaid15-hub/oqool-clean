// arabic-learning-agent.ts
// ============================================
// 🎓 Arabic Learning Agent - وكيل التعليم العربي
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { CodeFile } from '../core/god-mode.js';

/**
 * Lesson Structure - بنية الدرس
 */
export interface ArabicLesson {
  title: string;
  titleArabic: string;
  level: 'مبتدئ' | 'متوسط' | 'متقدم';
  objectives: string[];
  content: string;
  examples: CodeFile[];
  exercises: ArabicExercise[];
  summary: string;
}

/**
 * Exercise Structure - بنية التمرين
 */
export interface ArabicExercise {
  question: string;
  hints: string[];
  solution: string;
  difficulty: 'سهل' | 'متوسط' | 'صعب';
}

/**
 * Documentation Structure - بنية الوثائق
 */
export interface ArabicDocumentation {
  title: string;
  description: string;
  sections: {
    title: string;
    content: string;
    codeExamples?: CodeFile[];
  }[];
  apiReference?: {
    name: string;
    description: string;
    parameters: { name: string; type: string; description: string }[];
    returns: string;
    examples: string[];
  }[];
}

/**
 * ArabicLearningAgent: Specialized in Arabic Technical Education
 *
 * @description متخصص في التعليم التقني والوثائق والأمثلة العملية باللغة العربية
 * @class
 * @module Agents
 *
 * @key_capabilities
 * - شرح المفاهيم التعليمية (Teaching Concepts)
 * - توليد الدروس التفاعلية (Interactive Lessons)
 * - إنشاء الوثائق التقنية (Technical Documentation)
 * - توليد الأمثلة العملية (Practical Examples)
 * - المحادثة التقنية (Technical Chat)
 * - متابعة التقدم (Progress Tracking)
 *
 * @complexity_level Expert
 * @ai_model claude-sonnet-4-20250514
 */
export class ArabicLearningAgent {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    const hasValidClaude = config.claude?.startsWith('sk-ant-');
    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: hasValidClaude ? 'claude' : 'deepseek',
    });
    this.provider = provider;
  }

  // ============================================
  // 📚 توليد دروس تفاعلية
  // Generate Interactive Lessons
  // ============================================

  /**
   * توليد درس تعليمي شامل عن مفهوم برمجي
   * @param {string} concept - المفهوم البرمجي
   * @param {string} level - المستوى (مبتدئ، متوسط، متقدم)
   * @param {string} language - لغة البرمجة
   * @returns {Promise<ArabicLesson>}
   */
  async generateLesson(
    concept: string,
    level: 'مبتدئ' | 'متوسط' | 'متقدم',
    language: string = 'javascript'
  ): Promise<ArabicLesson> {
    const prompt = `
أنت معلم برمجة خبير متخصص في التعليم باللغة العربية.

قم بإنشاء درس تعليمي شامل عن: ${concept}
المستوى: ${level}
لغة البرمجة: ${language}

يجب أن يحتوي الدرس على:

1. **العنوان** (بالعربية والإنجليزية)

2. **الأهداف التعليمية** (3-5 أهداف واضحة)

3. **المحتوى التعليمي** (شرح مفصل وسلس يشمل):
   - ما هو المفهوم؟
   - لماذا هو مهم؟
   - كيف يعمل؟
   - متى نستخدمه؟

4. **أمثلة عملية** (3 أمثلة بمستويات متدرجة):
   - مثال بسيط
   - مثال متوسط
   - مثال متقدم

   لكل مثال، استخدم التنسيق:
   \`\`\`filename:example-${concept}-[level].${this.getExtension(language)}
   // الكود هنا مع تعليقات بالعربية
   \`\`\`

5. **تمارين عملية** (3 تمارين):
   - السؤال
   - تلميحات
   - الحل
   - مستوى الصعوبة

6. **ملخص الدرس**

استخدم لغة عربية واضحة وأسلوب تعليمي شيق مع أمثلة من الحياة اليومية.

أرجع الناتج بصيغة JSON منظمة.
`;

    try {
      const response = await this.callClaude(prompt);
      return this.parseLesson(response, concept, level, language);
    } catch (error) {
      console.error('فشل توليد الدرس:', error);
      throw error;
    }
  }

  // ============================================
  // 📖 شرح مفهوم برمجي
  // Explain Programming Concept
  // ============================================

  /**
   * شرح مفهوم برمجي بأسلوب تعليمي مبسط
   * @param {string} concept - المفهوم
   * @param {string} context - السياق الإضافي
   * @returns {Promise<string>}
   */
  async explainConcept(concept: string, context?: string): Promise<string> {
    const prompt = `
أنت معلم ماهر في شرح المفاهيم البرمجية المعقدة بطريقة بسيطة وممتعة.

المفهوم: ${concept}
${context ? `السياق: ${context}` : ''}

اشرح هذا المفهوم باللغة العربية بطريقة:
1. مبسطة وسهلة الفهم
2. مع أمثلة من الحياة اليومية
3. مع رسومات توضيحية نصية إن أمكن
4. مع مثال برمجي بسيط

ابدأ من الأساسيات ثم تدرج للتفاصيل.
`;

    try {
      const response = await this.callClaude(prompt);
      return response;
    } catch (error) {
      console.error('فشل شرح المفهوم:', error);
      throw error;
    }
  }

  // ============================================
  // 📝 توليد الوثائق التقنية
  // Generate Technical Documentation
  // ============================================

  /**
   * توليد وثائق تقنية شاملة لمشروع أو مكتبة
   * @param {string} projectName - اسم المشروع
   * @param {CodeFile[]} codeFiles - ملفات الكود
   * @param {string} description - وصف المشروع
   * @returns {Promise<ArabicDocumentation>}
   */
  async generateDocumentation(
    projectName: string,
    codeFiles: CodeFile[],
    description: string
  ): Promise<ArabicDocumentation> {
    const prompt = `
أنت كاتب وثائق تقنية محترف متخصص في الكتابة باللغة العربية.

اسم المشروع: ${projectName}
الوصف: ${description}

الكود:
${codeFiles.map((f) => `\n=== ${f.path} ===\n${f.content}`).join('\n')}

قم بإنشاء وثائق تقنية شاملة باللغة العربية تتضمن:

1. **المقدمة**
   - نظرة عامة
   - الميزات الرئيسية
   - متطلبات التشغيل

2. **دليل البدء السريع**
   - التثبيت
   - الإعداد
   - أول مثال

3. **دليل الاستخدام**
   - المفاهيم الأساسية
   - حالات الاستخدام
   - أمثلة عملية

4. **مرجع API** (لكل دالة/كلاس):
   - الاسم
   - الوصف
   - المعاملات
   - القيمة المرجعة
   - أمثلة الاستخدام

5. **الأسئلة الشائعة**

6. **استكشاف الأخطاء وإصلاحها**

استخدم لغة عربية فصيحة واضحة مع تنسيق Markdown احترافي.
`;

    try {
      const response = await this.callClaude(prompt);
      return this.parseDocumentation(response, projectName);
    } catch (error) {
      console.error('فشل توليد الوثائق:', error);
      throw error;
    }
  }

  // ============================================
  // 💡 توليد أمثلة عملية بسياق عربي
  // Generate Practical Arabic Examples
  // ============================================

  /**
   * توليد أمثلة عملية من البيئة العربية
   * @param {string} concept - المفهوم
   * @param {string} domain - المجال (تجارة إلكترونية، تعليم، صحة...)
   * @param {string} language - لغة البرمجة
   * @returns {Promise<CodeFile[]>}
   */
  async generateArabicContextExamples(
    concept: string,
    domain: string,
    language: string = 'javascript'
  ): Promise<CodeFile[]> {
    const prompt = `
أنشئ أمثلة برمجية عملية عن: ${concept}

المجال: ${domain} (مثال: نظام مكتبة، متجر إلكتروني، نظام مدرسي)
لغة البرمجة: ${language}

المطلوب:
1. مثال عملي من البيئة العربية/الخليجية
2. استخدم أسماء عربية للمتغيرات والوظائف (مترجمة بالإنجليزية)
3. بيانات واقعية من المنطقة
4. تعليقات شاملة بالعربية

أمثلة للأسماء:
- المدن: الرياض، دبي، القاهرة
- الأسماء: أحمد، فاطمة، محمد
- المنتجات: تمر، عباية، قهوة عربية
- العملات: ريال، درهم، جنيه

قدم 3 أمثلة بمستويات مختلفة.

لكل مثال، استخدم:
\`\`\`filename:${domain}-example-[number].${this.getExtension(language)}
// الكود
\`\`\`
`;

    try {
      const response = await this.callClaude(prompt);
      return this.parseCodeFiles(response);
    } catch (error) {
      console.error('فشل توليد الأمثلة:', error);
      throw error;
    }
  }

  // ============================================
  // 💬 المحادثة التقنية التفاعلية
  // Interactive Technical Chat
  // ============================================

  /**
   * محادثة تقنية تفاعلية للإجابة على الأسئلة
   * @param {string} question - السؤال
   * @param {string[]} conversationHistory - سجل المحادثة
   * @returns {Promise<string>}
   */
  async chat(question: string, conversationHistory: string[] = []): Promise<string> {
    const prompt = `
أنت مساعد برمجي ذكي متخصص في الدعم التقني باللغة العربية.

${conversationHistory.length > 0 ? `\nسجل المحادثة السابقة:\n${conversationHistory.join('\n\n')}\n` : ''}

السؤال الجديد: ${question}

قدم إجابة:
1. واضحة ومباشرة
2. مع أمثلة برمجية عند الحاجة
3. خطوة بخطوة للمواضيع المعقدة
4. مع روابط أو مراجع عند الإمكان
5. بأسلوب ودي ومشجع

إذا كان السؤال يحتاج لكود، قدم الكود مع الشرح.
`;

    try {
      const response = await this.callClaude(prompt);
      return response;
    } catch (error) {
      console.error('فشل المحادثة:', error);
      throw error;
    }
  }

  // ============================================
  // 📊 توليد تمارين وتقييمات
  // Generate Exercises and Assessments
  // ============================================

  /**
   * توليد تمارين عملية لمفهوم معين
   * @param {string} concept - المفهوم
   * @param {number} count - عدد التمارين
   * @param {string} difficulty - مستوى الصعوبة
   * @returns {Promise<ArabicExercise[]>}
   */
  async generateExercises(
    concept: string,
    count: number = 5,
    difficulty: 'سهل' | 'متوسط' | 'صعب' = 'متوسط'
  ): Promise<ArabicExercise[]> {
    const prompt = `
أنشئ ${count} تمارين برمجية عن: ${concept}

مستوى الصعوبة: ${difficulty}

لكل تمرين:
1. **السؤال**: واضح ومحدد
2. **التلميحات**: 2-3 تلميحات مفيدة
3. **الحل**: كود كامل مع الشرح
4. **مستوى الصعوبة**: ${difficulty}

اجعل التمارين:
- عملية وواقعية
- متدرجة في الصعوبة
- مع سياق عربي إن أمكن

أرجع الناتج بصيغة JSON:
[
  {
    "question": "...",
    "hints": ["...", "..."],
    "solution": "...",
    "difficulty": "${difficulty}"
  }
]
`;

    try {
      const response = await this.callClaude(prompt);
      return this.parseExercises(response);
    } catch (error) {
      console.error('فشل توليد التمارين:', error);
      throw error;
    }
  }

  // ============================================
  // 🎯 توليد ملف README بالعربية
  // Generate Arabic README
  // ============================================

  /**
   * توليد ملف README شامل بالعربية
   * @param {string} projectName - اسم المشروع
   * @param {string} description - وصف المشروع
   * @param {string[]} features - الميزات
   * @param {string} techStack - التقنيات المستخدمة
   * @returns {Promise<string>}
   */
  async generateReadme(
    projectName: string,
    description: string,
    features: string[],
    techStack: string
  ): Promise<string> {
    const prompt = `
أنشئ ملف README.md احترافي باللغة العربية للمشروع التالي:

اسم المشروع: ${projectName}
الوصف: ${description}
الميزات: ${features.join(', ')}
التقنيات: ${techStack}

يجب أن يحتوي على:

# ${projectName}

## 📖 نظرة عامة
[وصف شامل]

## ✨ الميزات
- [قائمة الميزات]

## 🛠️ التقنيات المستخدمة
[التقنيات]

## 🚀 البدء السريع

### المتطلبات
[المتطلبات]

### التثبيت
\`\`\`bash
# خطوات التثبيت
\`\`\`

### الاستخدام
\`\`\`bash
# أمثلة الاستخدام
\`\`\`

## 📂 هيكل المشروع
[شجرة الملفات]

## 🤝 المساهمة
[إرشادات المساهمة]

## 📄 الترخيص
[معلومات الترخيص]

## 📞 التواصل
[معلومات التواصل]

استخدم تنسيق Markdown احترافي مع الأيقونات.
`;

    try {
      const response = await this.callClaude(prompt);
      return response;
    } catch (error) {
      console.error('فشل توليد README:', error);
      throw error;
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'coder',
      prompt,
      undefined,
      this.provider
    );
    return result.response;
  }

  private parseLesson(
    text: string,
    concept: string,
    level: string,
    language: string
  ): ArabicLesson {
    // محاولة استخراج JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || concept,
          titleArabic: parsed.titleArabic || concept,
          level: level as any,
          objectives: parsed.objectives || [],
          content: parsed.content || text,
          examples: this.parseCodeFiles(text),
          exercises: parsed.exercises || [],
          summary: parsed.summary || '',
        };
      }
    } catch (error) {
      // فشل التحليل، استخدم القيم الافتراضية
    }

    return {
      title: concept,
      titleArabic: concept,
      level: level as any,
      objectives: [],
      content: text,
      examples: this.parseCodeFiles(text),
      exercises: [],
      summary: '',
    };
  }

  private parseDocumentation(text: string, projectName: string): ArabicDocumentation {
    return {
      title: projectName,
      description: '',
      sections: [
        {
          title: 'الوثائق',
          content: text,
        },
      ],
    };
  }

  private parseCodeFiles(text: string): CodeFile[] {
    const files: CodeFile[] = [];
    const pattern = /```(?:filename:)?([^\n]+)\n([\s\S]*?)```/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();

      if (filePath && content) {
        files.push({
          path: filePath,
          content: content,
          language: this.detectLanguage(filePath),
          lines: content.split('\n').length,
        });
      }
    }

    return files;
  }

  private parseExercises(text: string): ArabicExercise[] {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('فشل تحليل التمارين:', error);
    }
    return [];
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
    };
    return langMap[ext || ''] || 'text';
  }

  private getExtension(language: string): string {
    const extMap: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      go: 'go',
      rust: 'rs',
    };
    return extMap[language.toLowerCase()] || 'txt';
  }
}
