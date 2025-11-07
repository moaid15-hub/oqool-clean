// ═══════════════════════════════════════════════════════
// 🤖 Unified AI Adapter - النظام الموحد الكامل
// ═══════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { Ollama } from 'ollama';

// ═══════════════════════════════════════════════════════
// 📋 Types - الأنواع الموحدة
// ═══════════════════════════════════════════════════════

export type AIProvider = 'claude' | 'openai' | 'deepseek' | 'gemini' | 'ollama' | 'auto';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UnifiedToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface UnifiedRequest {
  messages: Message[];
  tools?: UnifiedToolDefinition[];
  maxTokens?: number;
  temperature?: number;
}

export interface UnifiedResponse {
  text: string;
  toolCalls?: ToolCall[];
  needsToolResults?: boolean;
  provider: AIProvider;
  model: string;
  cost: number;
}

// ═══════════════════════════════════════════════════════
// 🔄 AI Provider Adapter - المحول الموحد
// ═══════════════════════════════════════════════════════

class AIProviderAdapter {
  private claudeClient?: Anthropic;
  private openaiClient?: OpenAI;
  private deepseekClient?: OpenAI;
  private geminiClient?: GoogleGenerativeAI;
  private ollamaClient?: Ollama;

  constructor(config: {
    claude?: string;
    openai?: string;
    deepseek?: string;
    gemini?: string;
    ollama?: boolean;
  }) {
    if (config.claude) {
      this.claudeClient = new Anthropic({ apiKey: config.claude });
    }
    if (config.openai) {
      this.openaiClient = new OpenAI({ apiKey: config.openai });
    }
    if (config.deepseek) {
      this.deepseekClient = new OpenAI({
        apiKey: config.deepseek,
        baseURL: 'https://api.deepseek.com/v1',
      });
    }
    if (config.gemini) {
      this.geminiClient = new GoogleGenerativeAI(config.gemini);
    }
    if (config.ollama) {
      this.ollamaClient = new Ollama({ host: 'http://localhost:11434' });
    }
  }

  // ═══════════════════════════════════════════════════════
  // 🚀 الدالة الرئيسية - إرسال موحد
  // ═══════════════════════════════════════════════════════

  async send(
    provider: AIProvider,
    request: UnifiedRequest
  ): Promise<UnifiedResponse> {
    switch (provider) {
      case 'claude':
        if (!this.claudeClient) throw new Error('Claude not configured');
        return await this.sendToClaude(request);

      case 'openai':
        if (!this.openaiClient) throw new Error('OpenAI not configured');
        return await this.sendToOpenAI(request, 'openai');

      case 'deepseek':
        if (!this.deepseekClient) throw new Error('DeepSeek not configured');
        return await this.sendToOpenAI(request, 'deepseek');

      case 'gemini':
        if (!this.geminiClient) throw new Error('Gemini not configured');
        return await this.sendToGemini(request);

      case 'ollama':
        if (!this.ollamaClient) throw new Error('Ollama not configured');
        return await this.sendToOllama(request);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // ─────────────────────────────────────────────────────
  // 🔵 Claude Adapter
  // ─────────────────────────────────────────────────────

  private async sendToClaude(request: UnifiedRequest): Promise<UnifiedResponse> {
    // 1. استخراج system prompt
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    // 2. تحويل Tools لصيغة Claude
    const claudeTools = request.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters,
        required: Object.keys(tool.parameters),
      },
    }));

    // 3. تحويل Messages
    const claudeMessages = userMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // 4. إرسال الطلب
    const response = await this.claudeClient!.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      system: systemMessage?.content,
      messages: claudeMessages,
      tools: claudeTools,
    });

    // 5. معالجة الرد
    return this.normalizeClaudeResponse(response);
  }

  // 🔄 توحيد رد Claude
  private normalizeClaudeResponse(response: any): UnifiedResponse {
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input,
        });
      }
    }

    // حساب التكلفة التقريبية
    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const cost = (inputTokens * 3.0 + outputTokens * 15.0) / 1_000_000;

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      needsToolResults: toolCalls.length > 0,
      provider: 'claude',
      model: response.model,
      cost,
    };
  }

  // ─────────────────────────────────────────────────────
  // 🟢 OpenAI / DeepSeek Adapter
  // ─────────────────────────────────────────────────────

  private async sendToOpenAI(
    request: UnifiedRequest,
    type: 'openai' | 'deepseek'
  ): Promise<UnifiedResponse> {
    const client = type === 'openai' ? this.openaiClient! : this.deepseekClient!;

    // 1. تحويل Tools لصيغة OpenAI
    const openaiTools = request.tools?.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties: tool.parameters,
          required: Object.keys(tool.parameters),
        },
      },
    }));

    // 2. تحويل Messages (System في messages)
    const openaiMessages = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. إرسال الطلب
    const response = await client.chat.completions.create({
      model: type === 'openai' ? 'gpt-4-turbo' : 'deepseek-chat',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      messages: openaiMessages as any,
      tools: openaiTools,
    });

    // 4. معالجة الرد
    return this.normalizeOpenAIResponse(response, type);
  }

  // 🔄 توحيد رد OpenAI
  private normalizeOpenAIResponse(response: any, type: 'openai' | 'deepseek'): UnifiedResponse {
    const message = response.choices[0]?.message;
    const text = message?.content || '';
    const toolCalls: ToolCall[] = [];

    if (message?.tool_calls) {
      for (const call of message.tool_calls) {
        toolCalls.push({
          id: call.id,
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
        });
      }
    }

    // حساب التكلفة
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    let cost = 0;
    if (type === 'openai') {
      cost = (inputTokens * 10.0 + outputTokens * 30.0) / 1_000_000; // GPT-4 Turbo
    } else {
      cost = (inputTokens * 0.14 + outputTokens * 0.28) / 1_000_000; // DeepSeek
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      needsToolResults: toolCalls.length > 0,
      provider: type === 'openai' ? 'openai' : 'deepseek',
      model: response.model,
      cost,
    };
  }

  // ─────────────────────────────────────────────────────
  // 🔴 Gemini Adapter
  // ─────────────────────────────────────────────────────

  private async sendToGemini(request: UnifiedRequest): Promise<UnifiedResponse> {
    const model = this.geminiClient!.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    // 1. تحويل Tools لصيغة Gemini
    const geminiTools = request.tools
      ? [
          {
            functionDeclarations: request.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              parameters: {
                type: SchemaType.OBJECT,
                properties: tool.parameters,
                required: Object.keys(tool.parameters),
              },
            })),
          },
        ]
      : undefined;

    // 2. تحويل Messages لصيغة Gemini
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // 3. إرسال الطلب
    const result = await model.generateContent({
      contents,
      systemInstruction: systemMessage?.content,
      tools: geminiTools,
      generationConfig: {
        maxOutputTokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
      },
    });

    // 4. معالجة الرد
    return this.normalizeGeminiResponse(result);
  }

  // 🔄 توحيد رد Gemini
  private normalizeGeminiResponse(result: any): UnifiedResponse {
    const response = result.response;
    let text = '';
    const toolCalls: ToolCall[] = [];

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          text += part.text;
        } else if (part.functionCall) {
          toolCalls.push({
            id: `gemini_${Date.now()}_${Math.random()}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args,
          });
        }
      }
    }

    // حساب التكلفة التقريبية
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    const cost = (inputTokens * 0.1 + outputTokens * 0.4) / 1_000_000; // Gemini 2.0 Flash

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      needsToolResults: toolCalls.length > 0,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      cost,
    };
  }

  // ─────────────────────────────────────────────────────
  // 🏠 Ollama Adapter (محلي ومجاني)
  // ─────────────────────────────────────────────────────

  private async sendToOllama(request: UnifiedRequest): Promise<UnifiedResponse> {
    // استخراج system prompt
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const userMessages = request.messages.filter((m) => m.role !== 'system');

    // تجهيز الرسائل
    const messages = userMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // استدعاء Ollama
    const response = await this.ollamaClient!.chat({
      model: 'llama3.2', // النموذج الافتراضي
      messages: systemMessage
        ? [{ role: 'system', content: systemMessage.content }, ...messages]
        : messages,
      stream: false,
    });

    return {
      text: response.message.content,
      toolCalls: undefined, // Ollama tools تحتاج تكامل إضافي
      needsToolResults: false,
      provider: 'ollama',
      model: 'llama3.2',
      cost: 0, // مجاني!
    };
  }
}

// ═══════════════════════════════════════════════════════
// 🎯 Unified AI Adapter - النظام الكامل
// ═══════════════════════════════════════════════════════

export class UnifiedAIAdapterWithTools {
  private adapter: AIProviderAdapter;
  private defaultProvider: AIProvider = 'deepseek';

  constructor(config: {
    claude?: string;
    openai?: string;
    deepseek?: string;
    gemini?: string;
    ollama?: boolean;
    defaultProvider?: AIProvider;
  }) {
    this.adapter = new AIProviderAdapter(config);
    if (config.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 💬 محادثة بدون أدوات (الموجود حالياً)
  // ═══════════════════════════════════════════════════════

  async chat(messages: Message[], provider?: AIProvider): Promise<UnifiedResponse> {
    const selectedProvider = provider || this.defaultProvider;
    return await this.adapter.send(selectedProvider, { messages });
  }

  // ═══════════════════════════════════════════════════════
  // 🎭 معالجة مع شخصية (للـ Agents)
  // ═══════════════════════════════════════════════════════

  async processWithPersonality(
    personalityOrRole: string,
    prompt: string,
    tools?: any,
    provider?: AIProvider
  ): Promise<{ response: string }> {
    // تحديد النظام بناءً على الشخصية
    let systemContent = '';

    // إذا كانت role معروفة، استخدم شخصية محددة
    const personalities: Record<string, string> = {
      'architect': 'أنت مهندس معماري خبير في تصميم الأنظمة البرمجية. تصمم بنيات قابلة للتوسع وسهلة الصيانة.',
      'backend': 'أنت مطور Backend محترف متخصص في بناء APIs وقواعد البيانات والخدمات الخلفية.',
      'frontend': 'أنت مهندس Frontend خبير في بناء واجهات مستخدم تفاعلية وجميلة.',
      'security': 'أنت خبير أمان سيبراني متخصص في اكتشاف الثغرات وتأمين التطبيقات.',
      'reviewer': 'أنت مراجع كود محترف تحلل الكود وتقدم اقتراحات للتحسين.',
      'tester': 'أنت مهندس اختبارات خبير في كتابة وتنفيذ اختبارات شاملة.',
      'debugger': 'أنت مصحح أخطاء محترف تجد وتحل المشاكل البرمجية بسرعة.',
      'devops': 'أنت مهندس DevOps متخصص في CI/CD والنشر والبنية التحتية.',
      'seo': 'أنت متخصص SEO خبير في تحسين المواقع لمحركات البحث.',
      'ui-ux': 'أنت مصمم UI/UX محترف تصمم تجارب مستخدم رائعة.',
      'optimizer': 'أنت خبير تحسين أداء متخصص في جعل التطبيقات أسرع وأكثر كفاءة.',
      'ml': 'أنت مهندس تعلم آلي خبير في بناء نماذج ML وAI.',
      'fullstack': 'أنت مطور Fullstack شامل تجمع بين Frontend وBackend.',
      'intelligent-predictor': 'أنت محلل تنبؤي ذكي تتوقع المشاكل وتقترح حلول استباقية.',
      'computer-control': 'أنت نظام تحكم حاسوبي ذكي يمكنه تنفيذ أوامر النظام وإدارة الملفات.',
      'arabic-learning': 'أنت معلم برمجة باللغة العربية متخصص في تعليم المفاهيم البرمجية.',
      'arabic-quality': 'أنت مدقق جودة للنصوص العربية في الكود والتوثيق.',
    };

    systemContent = personalities[personalityOrRole] || personalityOrRole;

    const messages: Message[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: prompt }
    ];

    const response = await this.chat(messages, provider);
    return { response: response.text };
  }

  // ═══════════════════════════════════════════════════════
  // 🔧 محادثة مع أدوات (الجديد!)
  // ═══════════════════════════════════════════════════════

  async chatWithTools(
    messages: Message[],
    tools: UnifiedToolDefinition[],
    provider?: AIProvider
  ): Promise<UnifiedResponse> {
    // اختيار المزود - إذا طلب tools، استخدم مزود يدعمها
    let selectedProvider = provider || this.selectProviderForTools();

    return await this.adapter.send(selectedProvider, {
      messages,
      tools,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 🔄 معالجة Loop كامل مع Tools
  // ═══════════════════════════════════════════════════════

  async executeWithTools(
    messages: Message[],
    tools: UnifiedToolDefinition[],
    toolExecutor: (name: string, args: any) => Promise<string>,
    maxIterations: number = 10,
    provider?: AIProvider
  ): Promise<{ text: string; iterations: number; totalCost: number }> {
    const conversationHistory = [...messages];
    let iterations = 0;
    let totalCost = 0;

    while (iterations < maxIterations) {
      iterations++;

      // 1. إرسال الطلب
      const response = await this.chatWithTools(conversationHistory, tools, provider);
      totalCost += response.cost;

      // 2. إذا لا توجد tool calls، انتهينا
      if (!response.needsToolResults) {
        return {
          text: response.text,
          iterations,
          totalCost,
        };
      }

      // 3. تنفيذ الأدوات
      const toolResults: string[] = [];
      for (const toolCall of response.toolCalls!) {
        console.log(`🔧 تنفيذ: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`);
        const result = await toolExecutor(toolCall.name, toolCall.arguments);
        toolResults.push(result);
      }

      // 4. إضافة النتائج للمحادثة
      conversationHistory.push({
        role: 'assistant',
        content: response.text || `استخدمت الأدوات: ${response.toolCalls!.map((t) => t.name).join(', ')}`,
      });

      conversationHistory.push({
        role: 'user',
        content: `نتائج الأدوات:\n${toolResults.join('\n\n')}`,
      });
    }

    return {
      text: 'وصلت للحد الأقصى من المحاولات',
      iterations,
      totalCost,
    };
  }

  // ═══════════════════════════════════════════════════════
  // 🎯 اختيار مزود يدعم Tools
  // ═══════════════════════════════════════════════════════

  private selectProviderForTools(): AIProvider {
    // الأولوية:
    // 1. Gemini (أسرع وأرخص ويدعم tools)
    // 2. Claude (أفضل جودة ويدعم tools)
    // 3. OpenAI (يدعم tools لكن غالي)
    // ⚠️ DeepSeek قد لا يدعم tools - نتجنبه

    // في الكود الحقيقي، تحقق من المزودين المتاحين
    return 'gemini'; // افتراضي
  }
}

// ═══════════════════════════════════════════════════════
// 📝 مثال استخدام
// ═══════════════════════════════════════════════════════

export async function example() {
  const adapter = new UnifiedAIAdapterWithTools({
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  });

  // تعريف الأدوات
  const tools: UnifiedToolDefinition[] = [
    {
      name: 'read_file',
      description: 'قراءة محتوى ملف',
      parameters: {
        path: { type: 'string', description: 'مسار الملف' },
      },
    },
    {
      name: 'write_file',
      description: 'كتابة محتوى لملف',
      parameters: {
        path: { type: 'string', description: 'مسار الملف' },
        content: { type: 'string', description: 'المحتوى' },
      },
    },
  ];

  // تنفيذ الأدوات
  const toolExecutor = async (name: string, args: any): Promise<string> => {
    if (name === 'read_file') {
      // قراءة فعلية من النظام
      return `محتوى الملف: ${args.path}`;
    }
    if (name === 'write_file') {
      // كتابة فعلية للنظام
      return `تم الكتابة بنجاح إلى: ${args.path}`;
    }
    return 'أداة غير معروفة';
  };

  // استخدام مع Gemini (أسرع وأرخص)
  const result = await adapter.executeWithTools(
    [
      { role: 'system', content: 'أنت مساعد برمجة ذكي' },
      { role: 'user', content: 'اقرأ ملف package.json وأضف dependency جديد' },
    ],
    tools,
    toolExecutor,
    10,
    'gemini' // أو 'claude' للجودة الأعلى
  );

  console.log('النتيجة:', result.text);
  console.log('عدد الدورات:', result.iterations);
  console.log('التكلفة الإجمالية: $', result.totalCost.toFixed(4));
}
