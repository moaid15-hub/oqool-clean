/**
 * LangChain Integration for Oqool AI
 *
 * يوفر هذا الملف تكاملاً متقدماً مع LangChain لإنشاء AI workflows معقدة
 *
 * ملاحظة: هذا إصدار مبسط يعمل مع LangChain v1.x
 */

import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

/**
 * AI Agent متقدم باستخدام LangChain
 */
export class OqoolLangChainAgent {
  private model: ChatOpenAI;
  private chatHistory: Array<{ role: string; content: string }> = [];

  constructor(apiKey?: string) {
    // إنشاء نموذج OpenAI
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      modelName: 'gpt-4',
      temperature: 0.7,
    });
  }

  /**
   * تحليل مشروع بالكامل باستخدام AI
   */
  async analyzeProject(projectPath: string, files: string[]): Promise<{
    architecture: string;
    issues: string[];
    suggestions: string[];
    refactoringPlan: string;
  }> {
    // تحليل البنية المعمارية
    const architecturePrompt = `
      قم بتحليل البنية المعمارية للمشروع التالي:
      المسار: ${projectPath}
      عدد الملفات: ${files.length}

      الملفات الرئيسية:
      ${files.slice(0, 10).join('\n')}

      قدم تحليلاً معمارياً شاملاً.
    `;

    const architectureResponse = await this.model.invoke([
      new SystemMessage('أنت خبير في تحليل البنية المعمارية للمشاريع البرمجية.'),
      new HumanMessage(architecturePrompt),
    ]);

    // تحليل المشاكل
    const issuesPrompt = `
      بناءً على التحليل المعماري السابق، ما هي المشاكل المحتملة في هذا المشروع؟
      قدم قائمة بالمشاكل مع الأولوية.
    `;

    const issuesResponse = await this.model.invoke([
      new SystemMessage('أنت خبير في اكتشاف المشاكل في المشاريع البرمجية.'),
      new HumanMessage(issuesPrompt),
    ]);

    // اقتراحات التحسين
    const suggestionsPrompt = `
      بناءً على المشاكل المحددة، ما هي اقتراحاتك لتحسين المشروع؟
    `;

    const suggestionsResponse = await this.model.invoke([
      new SystemMessage('أنت خبير في تحسين جودة الكود.'),
      new HumanMessage(suggestionsPrompt),
    ]);

    // خطة Refactoring
    const refactoringPrompt = `
      قم بإنشاء خطة refactoring تفصيلية خطوة بخطوة.
    `;

    const refactoringResponse = await this.model.invoke([
      new SystemMessage('أنت خبير في refactoring الكود.'),
      new HumanMessage(refactoringPrompt),
    ]);

    return {
      architecture: String(architectureResponse.content),
      issues: this.parseIssues(String(issuesResponse.content)),
      suggestions: this.parseSuggestions(String(suggestionsResponse.content)),
      refactoringPlan: String(refactoringResponse.content),
    };
  }

  /**
   * توليد كود بناءً على وصف
   */
  async generateCode(description: string, language: string = 'typescript'): Promise<string> {
    const prompt = `
      قم بتوليد كود ${language} بناءً على الوصف التالي:
      ${description}

      الكود يجب أن يكون:
      - احترافي ومنظم
      - يتبع best practices
      - موثق جيداً
      - قابل للاختبار
    `;

    const response = await this.model.invoke([
      new SystemMessage(`أنت خبير في برمجة ${language}.`),
      new HumanMessage(prompt),
    ]);

    return this.extractCode(String(response.content));
  }

  /**
   * مراجعة كود
   */
  async reviewCode(code: string): Promise<{
    rating: number;
    issues: string[];
    suggestions: string[];
    refactored?: string;
  }> {
    const prompt = `
      قم بمراجعة الكود التالي:

      \`\`\`
      ${code}
      \`\`\`

      قدم:
      1. تقييم من 10
      2. المشاكل الموجودة
      3. اقتراحات التحسين
      4. نسخة محسنة من الكود
    `;

    const response = await this.model.invoke([
      new SystemMessage('أنت خبير في مراجعة الكود وتحسينه.'),
      new HumanMessage(prompt),
    ]);

    const content = String(response.content);

    return {
      rating: this.extractRating(content),
      issues: this.parseIssues(content),
      suggestions: this.parseSuggestions(content),
      refactored: this.extractCode(content),
    };
  }

  /**
   * مساعد برمجة تفاعلي
   */
  async chat(message: string): Promise<string> {
    this.chatHistory.push({ role: 'user', content: message });

    const messages = [
      new SystemMessage('أنت مساعد برمجة ذكي ومفيد.'),
      ...this.chatHistory.map(msg =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new SystemMessage(msg.content)
      ),
    ];

    const response = await this.model.invoke(messages);
    const content = String(response.content);

    this.chatHistory.push({ role: 'assistant', content });

    return content;
  }

  /**
   * مسح الذاكرة
   */
  clearMemory() {
    this.chatHistory = [];
  }

  // Helper methods
  private parseIssues(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.match(/^[\d\-\*]/))
      .map(line => line.replace(/^[\d\-\*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  private parseSuggestions(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.match(/^[\d\-\*]/))
      .map(line => line.replace(/^[\d\-\*]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  private extractCode(text: string): string {
    const codeBlockMatch = text.match(/```[\w]*\n([\s\S]*?)```/);
    return codeBlockMatch ? codeBlockMatch[1].trim() : text;
  }

  private extractRating(text: string): number {
    const ratingMatch = text.match(/(\d+)\s*\/\s*10/);
    return ratingMatch ? parseInt(ratingMatch[1]) : 5;
  }
}

/**
 * مثال استخدام RAG (Retrieval Augmented Generation)
 */
export class OqoolRAGSystem {
  private model: ChatOpenAI;

  constructor(apiKey?: string) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      modelName: 'gpt-4',
      temperature: 0.3,
    });
  }

  /**
   * البحث في قاعدة معرفية والإجابة على سؤال
   */
  async searchAndAnswer(
    question: string,
    context: string[]
  ): Promise<string> {
    const prompt = await PromptTemplate.fromTemplate(`
      السياق التالي يحتوي على معلومات من قاعدة البيانات:

      {context}

      السؤال: {question}

      قدم إجابة دقيقة بناءً على السياق المتاح فقط.
      إذا لم تجد الإجابة في السياق، قل "لا توجد معلومات كافية".
    `).format({
      context: context.join('\n\n'),
      question: question,
    });

    const response = await this.model.invoke([
      new SystemMessage('أنت مساعد ذكي يجيب على الأسئلة بناءً على السياق المعطى.'),
      new HumanMessage(prompt),
    ]);

    return String(response.content);
  }
}
