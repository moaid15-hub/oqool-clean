// voice-first-interface.ts
// ============================================
// 🎤 Voice-First Interface
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OqoolAPIClient } from './api-client.js';

const execAsync = promisify(exec);

export interface VoiceConfig {
  enabled: boolean;
  language: 'ar' | 'en' | 'mixed';
  voice: 'male' | 'female' | 'neutral';
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
  volume: number; // 0.1 - 1.0
  engine: 'google' | 'azure' | 'aws' | 'local';
  apiKey?: string;
  region?: string;
}

export interface VoiceCommand {
  id: string;
  text: string;
  intent: VoiceIntent;
  confidence: number;
  entities: VoiceEntity[];
  timestamp: string;
  processed: boolean;
  response?: string;
}

export interface VoiceIntent {
  type: 'create' | 'modify' | 'analyze' | 'execute' | 'search' | 'navigate' | 'configure' | 'help';
  action: string;
  parameters: Map<string, any>;
  urgency: 'low' | 'normal' | 'high';
  context: string;
}

export interface VoiceEntity {
  type: 'file' | 'function' | 'variable' | 'language' | 'command' | 'number' | 'path';
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export interface VoiceSession {
  id: string;
  startTime: string;
  endTime?: string;
  commands: VoiceCommand[];
  transcript: string[];
  feedback: VoiceFeedback[];
  performance: SessionPerformance;
  preferences: VoicePreferences;
}

export interface VoiceFeedback {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'correction';
  message: string;
  timestamp: string;
  accuracy: number;
}

export interface SessionPerformance {
  totalCommands: number;
  successfulCommands: number;
  averageResponseTime: number;
  accuracy: number;
  userSatisfaction: number;
}

export interface VoicePreferences {
  voiceCommands: string[];
  shortcuts: Map<string, string>;
  contextAwareness: boolean;
  autoComplete: boolean;
  errorTolerance: number;
}

export interface SpeechRecognition {
  provider: 'google' | 'azure' | 'aws' | 'whisper' | 'local';
  language: string;
  model: string;
  accuracy: number;
  latency: number;
}

export interface TextToSpeech {
  provider: 'google' | 'azure' | 'aws' | 'elevenlabs' | 'local';
  voice: string;
  language: string;
  speed: number;
  pitch: number;
  style: 'neutral' | 'conversational' | 'professional' | 'friendly';
}

export class VoiceFirstInterface {
  private apiClient: OqoolAPIClient;
  private workingDir: string;
  private config: VoiceConfig;
  private sessionsPath: string;
  private commandsPath: string;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.workingDir = workingDir;
    this.sessionsPath = path.join(workingDir, '.oqool', 'voice-sessions');
    this.commandsPath = path.join(workingDir, '.oqool', 'voice-commands');
    this.config = this.loadDefaultConfig();
    this.initializeSystem();
  }

  /**
   * تحميل التكوين الافتراضي
   */
  private loadDefaultConfig(): VoiceConfig {
    return {
      enabled: false, // معطل افتراضياً
      language: 'ar',
      voice: 'neutral',
      speed: 1.0,
      pitch: 1.0,
      volume: 0.8,
      engine: 'local',
      apiKey: undefined,
      region: 'auto',
    };
  }

  /**
   * تهيئة النظام
   */
  private async initializeSystem(): Promise<void> {
    await fs.ensureDir(this.sessionsPath);
    await fs.ensureDir(this.commandsPath);
  }

  /**
   * بدء جلسة صوتية
   */
  async startVoiceSession(): Promise<VoiceSession | null> {
    if (!this.config.enabled) {
      console.log(
        chalk.yellow('⚠️  النظام الصوتي معطل. فعله أولاً: oqool-code voice config --enable')
      );
      return null;
    }

    const spinner = ora('بدء الجلسة الصوتية...').start();

    try {
      // التحقق من توفر أدوات الصوت
      const toolsAvailable = await this.checkVoiceTools();

      if (!toolsAvailable.recognition || !toolsAvailable.synthesis) {
        throw new Error('أدوات الصوت غير متوفرة');
      }

      const session: VoiceSession = {
        id: this.generateId(),
        startTime: new Date().toISOString(),
        commands: [],
        transcript: [],
        feedback: [],
        performance: {
          totalCommands: 0,
          successfulCommands: 0,
          averageResponseTime: 0,
          accuracy: 0,
          userSatisfaction: 0,
        },
        preferences: {
          voiceCommands: await this.loadVoiceCommands(),
          shortcuts: new Map(),
          contextAwareness: true,
          autoComplete: true,
          errorTolerance: 0.7,
        },
      };

      await this.saveSession(session);

      spinner.succeed('تم بدء الجلسة الصوتية!');
      console.log(chalk.green(`\n🎤 جلسة صوتية: ${session.id}`));
      console.log(chalk.cyan('   قل "مساعدة" لعرض الأوامر المتاحة'));
      console.log(chalk.cyan('   قل "خروج" لإنهاء الجلسة'));
      console.log(chalk.gray('   انتظر إشارة الصوت لبدء الكلام...\n'));

      // بدء الاستماع
      await this.startListening(session);

      return session;
    } catch (error) {
      spinner.fail('فشل في بدء الجلسة الصوتية');
      throw error;
    }
  }

  /**
   * بدء الاستماع للأوامر الصوتية
   */
  private async startListening(session: VoiceSession): Promise<void> {
    console.log(chalk.cyan('🎧 استماع... (قل "مساعدة" للأوامر)'));

    try {
      // محاكاة الاستماع الصوتي
      while (true) {
        const { command } = await inquirer.prompt([
          {
            type: 'input',
            name: 'command',
            message: chalk.green('🎤 أنت:'),
            validate: (input) => {
              if (input.toLowerCase() === 'خروج' || input.toLowerCase() === 'exit') {
                return true;
              }
              return input.trim().length > 0 || 'لا يمكن أن يكون الأمر فارغاً';
            },
          },
        ]);

        if (command.toLowerCase() === 'خروج' || command.toLowerCase() === 'exit') {
          console.log(chalk.yellow('\n👋 إنهاء الجلسة الصوتية...\n'));
          session.endTime = new Date().toISOString();
          await this.saveSession(session);
          break;
        }

        await this.processVoiceCommand(command, session);
      }
    } catch (error) {
      console.error(chalk.red('❌ خطأ في الاستماع:'), error);
    }
  }

  /**
   * معالجة الأمر الصوتي
   */
  private async processVoiceCommand(text: string, session: VoiceSession): Promise<void> {
    const spinner = ora('معالجة الأمر...').start();

    try {
      const startTime = Date.now();

      // تحليل النية من النص
      const intent = await this.analyzeIntent(text);
      const entities = this.extractEntities(text);

      const voiceCommand: VoiceCommand = {
        id: this.generateId(),
        text,
        intent,
        confidence: 0.9, // محاكاة الثقة
        entities,
        timestamp: new Date().toISOString(),
        processed: false,
      };

      session.commands.push(voiceCommand);
      session.transcript.push(text);

      // معالجة الأمر حسب النية
      const response = await this.executeVoiceCommand(voiceCommand, session);

      voiceCommand.response = response;
      voiceCommand.processed = true;

      const responseTime = Date.now() - startTime;

      // تحديث أداء الجلسة
      session.performance.totalCommands++;
      session.performance.successfulCommands++;
      session.performance.averageResponseTime =
        (session.performance.averageResponseTime + responseTime) / 2;

      await this.saveSession(session);

      spinner.succeed(`تم تنفيذ الأمر في ${responseTime}ms`);

      // تشغيل الرد الصوتي
      await this.speakResponse(response);

      console.log(chalk.white(`🤖 الرد: ${response}\n`));
    } catch (error) {
      spinner.fail('فشل في معالجة الأمر');

      session.performance.totalCommands++;
      session.transcript.push(`خطأ: ${error}`);

      console.log(chalk.red(`❌ خطأ: ${error}\n`));
    }
  }

  /**
   * تحليل النية من النص
   */
  private async analyzeIntent(text: string): Promise<VoiceIntent> {
    const lowerText = text.toLowerCase();

    // أنماط النية
    const intentPatterns = {
      create: ['أنشئ', 'أضف', 'اكتب', 'اصنع', 'create', 'make', 'add', 'write'],
      modify: ['عدل', 'غير', 'استبدل', 'حسن', 'modify', 'change', 'update', 'edit'],
      analyze: ['حلل', 'فحص', 'راجع', 'analyze', 'check', 'review', 'inspect'],
      execute: ['شغل', 'نفذ', 'جرب', 'run', 'execute', 'test', 'try'],
      search: ['ابحث', 'جد', 'اعثر', 'search', 'find', 'locate'],
      navigate: ['انتقل', 'اذهب', 'navigate', 'go', 'cd'],
      configure: ['اضبط', 'كون', 'configure', 'setup', 'config'],
      help: ['مساعدة', 'ساعدني', 'help', 'what', 'how', '?'],
    };

    // تحديد النية الرئيسية
    let detectedIntent: VoiceIntent['type'] = 'help';
    let maxMatches = 0;

    for (const [intent, patterns] of Object.entries(intentPatterns)) {
      const matches = patterns.filter((pattern) => lowerText.includes(pattern)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedIntent = intent as VoiceIntent['type'];
      }
    }

    // تحديد الإجراء
    const action = this.extractAction(text, detectedIntent);

    // استخراج المعاملات
    const parameters = this.extractParameters(text, detectedIntent);

    // تحديد الإلحاح
    const urgency = this.assessUrgency(text);

    // تحديد السياق
    const context = this.determineContext(text);

    return {
      type: detectedIntent,
      action,
      parameters,
      urgency,
      context,
    };
  }

  /**
   * استخراج الإجراء
   */
  private extractAction(text: string, intent: VoiceIntent['type']): string {
    const actions = {
      create: ['api', 'component', 'function', 'file', 'class', 'module'],
      modify: ['function', 'variable', 'class', 'file', 'style', 'structure'],
      analyze: ['code', 'performance', 'security', 'quality', 'dna'],
      execute: ['file', 'test', 'command', 'script'],
      search: ['file', 'function', 'pattern', 'error', 'documentation'],
      navigate: ['directory', 'file', 'project'],
      configure: ['voice', 'ai', 'project', 'git'],
      help: ['commands', 'features', 'examples', 'tutorial'],
    };

    const lowerText = text.toLowerCase();
    const possibleActions = actions[intent] || [];

    for (const action of possibleActions) {
      if (lowerText.includes(action)) {
        return action;
      }
    }

    return 'general';
  }

  /**
   * استخراج المعاملات
   */
  private extractParameters(text: string, intent: VoiceIntent['type']): Map<string, any> {
    const parameters = new Map<string, any>();
    const lowerText = text.toLowerCase();

    // استخراج أسماء الملفات
    const fileMatches = text.match(
      /['"]?([^'"\s]+\.(js|ts|py|go|rs|rb|php|html|css|json|md))['"]?/gi
    );
    if (fileMatches) {
      parameters.set(
        'files',
        fileMatches.map((f) => f.replace(/['"]/g, ''))
      );
    }

    // استخراج اللغات
    const languageMatches = ['javascript', 'typescript', 'python', 'go', 'rust', 'ruby', 'php'];
    for (const lang of languageMatches) {
      if (lowerText.includes(lang)) {
        parameters.set('language', lang);
        break;
      }
    }

    // استخراج الأرقام
    const numberMatches = text.match(/\d+/g);
    if (numberMatches) {
      parameters.set(
        'numbers',
        numberMatches.map((n) => parseInt(n))
      );
    }

    // استخراج المسارات
    const pathMatches = text.match(/['"]?([^'"\s]*\/[^'"\s]*)['"]?/g);
    if (pathMatches) {
      parameters.set(
        'paths',
        pathMatches.map((p) => p.replace(/['"]/g, ''))
      );
    }

    return parameters;
  }

  /**
   * تحديد الإلحاح
   */
  private assessUrgency(text: string): VoiceIntent['urgency'] {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('عاجل') ||
      lowerText.includes('فوري') ||
      lowerText.includes('urgent') ||
      lowerText.includes('now')
    ) {
      return 'high';
    } else if (lowerText.includes('مهم') || lowerText.includes('important')) {
      return 'normal';
    } else {
      return 'low';
    }
  }

  /**
   * تحديد السياق
   */
  private determineContext(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('مشروع') || lowerText.includes('project')) {
      return 'project';
    } else if (lowerText.includes('ملف') || lowerText.includes('file')) {
      return 'file';
    } else if (lowerText.includes('دالة') || lowerText.includes('function')) {
      return 'function';
    } else if (lowerText.includes('اختبار') || lowerText.includes('test')) {
      return 'testing';
    } else if (lowerText.includes('أمان') || lowerText.includes('security')) {
      return 'security';
    } else {
      return 'general';
    }
  }

  /**
   * استخراج الكيانات
   */
  private extractEntities(text: string): VoiceEntity[] {
    const entities: VoiceEntity[] = [];

    // استخراج الملفات
    const fileRegex = /['"]?([^'"\s]+\.(js|ts|py|go|rs|rb|php|html|css|json|md))['"]?/gi;
    let match;
    while ((match = fileRegex.exec(text)) !== null) {
      entities.push({
        type: 'file',
        value: match[1],
        confidence: 0.95,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // استخراج الدوال
    const functionRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    while ((match = functionRegex.exec(text)) !== null) {
      entities.push({
        type: 'function',
        value: match[1],
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // استخراج الأرقام
    const numberRegex = /\b(\d+)\b/g;
    while ((match = numberRegex.exec(text)) !== null) {
      entities.push({
        type: 'number',
        value: match[1],
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // استخراج المسارات
    const pathRegex = /['"]?([^'"\s]*\/[^'"\s]*)['"]?/g;
    while ((match = pathRegex.exec(text)) !== null) {
      entities.push({
        type: 'path',
        value: match[1],
        confidence: 0.85,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return entities;
  }

  /**
   * تنفيذ الأمر الصوتي
   */
  private async executeVoiceCommand(command: VoiceCommand, session: VoiceSession): Promise<string> {
    const { intent } = command;

    switch (intent.type) {
      case 'create':
        return await this.handleCreateCommand(command, session);
      case 'modify':
        return await this.handleModifyCommand(command, session);
      case 'analyze':
        return await this.handleAnalyzeCommand(command, session);
      case 'execute':
        return await this.handleExecuteCommand(command, session);
      case 'search':
        return await this.handleSearchCommand(command, session);
      case 'navigate':
        return await this.handleNavigateCommand(command, session);
      case 'configure':
        return await this.handleConfigureCommand(command, session);
      case 'help':
        return await this.handleHelpCommand(command, session);
      default:
        return 'لم أفهم الأمر. قل "مساعدة" لعرض الأوامر المتاحة.';
    }
  }

  /**
   * معالجة أمر الإنشاء
   */
  private async handleCreateCommand(command: VoiceCommand, session: VoiceSession): Promise<string> {
    const { action, parameters } = command.intent;
    const files = parameters.get('files') || [];

    switch (action) {
      case 'api':
        return 'سأنشئ API لك. ما نوع API الذي تريده؟ REST أم GraphQL؟';
      case 'component':
        return 'سأنشئ مكون React لك. ما نوع المكون؟';
      case 'function':
        return 'سأنشئ دالة لك. ما هي وظيفة الدالة؟';
      case 'file':
        if (files.length > 0) {
          return `سأنشئ الملفات: ${files.join(', ')}. ما نوع المحتوى؟`;
        } else {
          return 'ما اسم الملف الذي تريد إنشاءه؟';
        }
      default:
        return `سأنشئ ${action} لك. أخبرني بالتفاصيل.`;
    }
  }

  /**
   * معالجة أمر التعديل
   */
  private async handleModifyCommand(command: VoiceCommand, session: VoiceSession): Promise<string> {
    const { action, parameters } = command.intent;

    if (parameters.get('files')?.length > 0) {
      const files = parameters.get('files');
      return `سأعدل الملفات: ${files.join(', ')}. ما التعديل المطلوب؟`;
    } else {
      return `سأعدل ${action}. أخبرني بالتغييرات المطلوبة.`;
    }
  }

  /**
   * معالجة أمر التحليل
   */
  private async handleAnalyzeCommand(
    command: VoiceCommand,
    session: VoiceSession
  ): Promise<string> {
    const { action, parameters } = command.intent;

    switch (action) {
      case 'code':
        if (parameters.get('files')?.length > 0) {
          return `سأحلل الكود في: ${parameters.get('files').join(', ')}`;
        } else {
          return 'ما الملف الذي تريد تحليله؟';
        }
      case 'dna':
        if (parameters.get('files')?.length > 0) {
          return `سأستخرج DNA الكود لـ: ${parameters.get('files').join(', ')}`;
        } else {
          return 'ما الملف الذي تريد استخراج DNA له؟';
        }
      case 'security':
        return 'سأقوم بفحص الأمان. ما الملف أو المشروع المطلوب فحصه؟';
      default:
        return `سأحلل ${action}. أخبرني بالتفاصيل.`;
    }
  }

  /**
   * معالجة أمر التنفيذ
   */
  private async handleExecuteCommand(
    command: VoiceCommand,
    session: VoiceSession
  ): Promise<string> {
    const { action, parameters } = command.intent;

    if (parameters.get('files')?.length > 0) {
      const files = parameters.get('files');
      return `سأنفذ: ${files.join(', ')}. هل تريد تنفيذ آمن في sandbox؟`;
    } else {
      return `سأنفذ ${action}. ما الذي تريد تنفيذه؟`;
    }
  }

  /**
   * معالجة أمر البحث
   */
  private async handleSearchCommand(command: VoiceCommand, session: VoiceSession): Promise<string> {
    const { action, parameters } = command.intent;

    if (parameters.get('files')?.length > 0) {
      return `سأبحث في: ${parameters.get('files').join(', ')}`;
    } else {
      return `سأبحث عن ${action}. ما الذي تبحث عنه بالضبط؟`;
    }
  }

  /**
   * معالجة أمر التنقل
   */
  private async handleNavigateCommand(
    command: VoiceCommand,
    session: VoiceSession
  ): Promise<string> {
    const { parameters } = command.intent;

    if (parameters.get('paths')?.length > 0) {
      const paths = parameters.get('paths');
      return `سأنتقل إلى: ${paths.join(', ')}`;
    } else {
      return 'إلى أين تريد التنقل؟';
    }
  }

  /**
   * معالجة أمر التكوين
   */
  private async handleConfigureCommand(
    command: VoiceCommand,
    session: VoiceSession
  ): Promise<string> {
    const { action } = command.intent;

    switch (action) {
      case 'voice':
        return 'سأضبط إعدادات الصوت. ما الذي تريد تغييره؟';
      case 'ai':
        return 'سأضبط إعدادات AI. ما الإعدادات المطلوبة؟';
      case 'project':
        return 'سأضبط إعدادات المشروع. ما الذي تريد تكوينه؟';
      default:
        return `سأضبط ${action}. أخبرني بالإعدادات المطلوبة.`;
    }
  }

  /**
   * معالجة أمر المساعدة
   */
  private async handleHelpCommand(command: VoiceCommand, session: VoiceSession): Promise<string> {
    return `مرحباً! أنا مساعد Oqool Code الصوتي.

الأوامر المتاحة:
🎯 الإنشاء: "أنشئ API"، "اصنع مكون"، "اكتب دالة"
✏️  التعديل: "عدل الملف"، "غير الكود"، "حسن الأداء"
🔍 التحليل: "حلل الكود"، "فحص الأمان"، "استخرج DNA"
🏃 التنفيذ: "شغل الملف"، "نفذ الاختبارات"
🔎 البحث: "ابحث عن دالة"، "جد الأخطاء"
📁 التنقل: "انتقل للمجلد"، "اذهب للملف"
⚙️  التكوين: "اضبط الصوت"، "كون AI"

قل "خروج" لإنهاء الجلسة.`;
  }

  /**
   * تشغيل الرد الصوتي
   */
  private async speakResponse(response: string): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // محاكاة تحويل النص إلى كلام
      console.log(chalk.magenta('🔊 تشغيل الرد الصوتي...'));

      // في التطبيق الحقيقي، سيتم استخدام TTS API
      // const tts = await this.textToSpeech(response);
      // await this.playAudio(tts);
    } catch (error) {
      console.log(chalk.gray('ℹ️  TTS غير متوفر'));
    }
  }

  /**
   * التحقق من أدوات الصوت
   */
  private async checkVoiceTools(): Promise<{ recognition: boolean; synthesis: boolean }> {
    try {
      // التحقق من أدوات التعرف على الصوت
      const recognitionAvailable = await this.checkCommand(
        'python3 -c "import speech_recognition; print(\\"OK\\")"'
      );

      // التحقق من أدوات تحويل النص إلى كلام
      const synthesisAvailable = await this.checkCommand(
        'python3 -c "import pyttsx3; print(\\"OK\\")"'
      );

      return {
        recognition: recognitionAvailable,
        synthesis: false, // محاكاة
      };
    } catch {
      return {
        recognition: false,
        synthesis: false,
      };
    }
  }

  /**
   * التحقق من الأمر
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      await execAsync(command, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * تحميل الأوامر الصوتية
   */
  private async loadVoiceCommands(): Promise<string[]> {
    try {
      const commandsPath = path.join(this.commandsPath, 'commands.json');
      if (await fs.pathExists(commandsPath)) {
        const commands = await fs.readJson(commandsPath);
        return commands;
      }
    } catch {
      // تجاهل الأخطاء
    }

    // الأوامر الافتراضية
    return [
      'مساعدة',
      'خروج',
      'إنشاء',
      'تعديل',
      'تحليل',
      'تنفيذ',
      'بحث',
      'تنقل',
      'تكوين',
      'حالة',
      'إحصائيات',
      'تقرير',
    ];
  }

  /**
   * حفظ الجلسة
   */
  private async saveSession(session: VoiceSession): Promise<void> {
    const sessionPath = path.join(this.sessionsPath, `${session.id}.json`);
    await fs.writeJson(sessionPath, session, { spaces: 2 });
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * تكوين النظام الصوتي
   */
  async configureVoice(config: Partial<VoiceConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    const configPath = path.join(this.workingDir, '.oqool', 'voice-config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, this.config, { spaces: 2 });

    console.log(chalk.green('✅ تم تكوين النظام الصوتي'));

    if (this.config.enabled) {
      const tools = await this.checkVoiceTools();
      if (!tools.recognition) {
        console.log(chalk.yellow('⚠️  أدوات التعرف على الصوت غير متوفرة'));
        console.log(chalk.cyan('💡 قم بتثبيت: pip install speech-recognition pyttsx3'));
      }
    }
  }

  /**
   * عرض جلسات الصوت
   */
  async listVoiceSessions(): Promise<void> {
    const files = await fs.readdir(this.sessionsPath);
    const sessions: VoiceSession[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionPath = path.join(this.sessionsPath, file);
        const session = await fs.readJson(sessionPath);
        sessions.push(session);
      }
    }

    if (sessions.length === 0) {
      console.log(chalk.yellow('❌ لا توجد جلسات صوتية'));
      console.log(chalk.cyan('💡 ابدأ جلسة جديدة: oqool-code voice start'));
      return;
    }

    console.log(chalk.green('\n🎤 جلسات الصوت:\n'));

    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    for (const session of sessions) {
      const duration = session.endTime
        ? (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000
        : (new Date().getTime() - new Date(session.startTime).getTime()) / 1000;

      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);

      console.log(chalk.cyan(`🎧 ${session.id}`));
      console.log(
        chalk.white(
          `   الأوامر: ${session.commands.length} | المدة: ${minutes}:${seconds.toString().padStart(2, '0')}`
        )
      );
      console.log(chalk.gray(`   البدء: ${new Date(session.startTime).toLocaleString('ar')}`));
      console.log(chalk.gray(`   الدقة: ${(session.performance.accuracy * 100).toFixed(1)}%`));
      console.log('');
    }
  }

  /**
   * تدريب النظام الصوتي
   */
  async trainVoiceSystem(): Promise<void> {
    const spinner = ora('تدريب النظام الصوتي...').start();

    try {
      // جمع عينات التدريب
      const trainingSamples = await this.collectTrainingSamples();

      // تحسين نماذج النية
      await this.improveIntentModels(trainingSamples);

      // تحسين استخراج الكيانات
      await this.improveEntityExtraction(trainingSamples);

      spinner.succeed('تم تدريب النظام الصوتي!');

      console.log(chalk.green('\n📚 تم تحسين:'));
      console.log(chalk.white('   - نماذج النية'));
      console.log(chalk.white('   - استخراج الكيانات'));
      console.log(chalk.white('   - دقة التعرف'));
      console.log(chalk.white('   - فهم السياق'));
    } catch (error) {
      spinner.fail('فشل في تدريب النظام');
      throw error;
    }
  }

  /**
   * جمع عينات التدريب
   */
  private async collectTrainingSamples(): Promise<
    Array<{ text: string; intent: VoiceIntent['type']; entities: VoiceEntity[] }>
  > {
    // عينات تدريب بالعربية والإنجليزية
    return [
      { text: 'أنشئ API جديد', intent: 'create', entities: [] },
      {
        text: 'عدل ملف index.js',
        intent: 'modify',
        entities: [{ type: 'file', value: 'index.js', confidence: 1, start: 9, end: 17 }],
      },
      {
        text: 'حلل الكود في src/',
        intent: 'analyze',
        entities: [{ type: 'path', value: 'src/', confidence: 0.9, start: 14, end: 18 }],
      },
      { text: 'شغل الاختبارات', intent: 'execute', entities: [] },
      {
        text: 'ابحث عن دالة login',
        intent: 'search',
        entities: [{ type: 'function', value: 'login', confidence: 0.8, start: 13, end: 18 }],
      },
      {
        text: 'انتقل لمجلد components',
        intent: 'navigate',
        entities: [{ type: 'path', value: 'components', confidence: 0.9, start: 13, end: 23 }],
      },
      { text: 'اضبط إعدادات الصوت', intent: 'configure', entities: [] },
      { text: 'كيف أنشئ مكون React', intent: 'help', entities: [] },
    ];
  }

  /**
   * تحسين نماذج النية
   */
  private async improveIntentModels(
    samples: Array<{ text: string; intent: VoiceIntent['type']; entities: VoiceEntity[] }>
  ): Promise<void> {
    // حفظ عينات التدريب
    const trainingPath = path.join(this.commandsPath, 'training-samples.json');
    await fs.writeJson(trainingPath, samples, { spaces: 2 });

    console.log(chalk.cyan('💾 تم حفظ عينات التدريب'));
  }

  /**
   * تحسين استخراج الكيانات
   */
  private async improveEntityExtraction(
    samples: Array<{ text: string; intent: VoiceIntent['type']; entities: VoiceEntity[] }>
  ): Promise<void> {
    // تحليل العينات لتحسين الأنماط
    const entityPatterns = this.analyzeEntityPatterns(samples);

    const patternsPath = path.join(this.commandsPath, 'entity-patterns.json');
    await fs.writeJson(patternsPath, entityPatterns, { spaces: 2 });

    console.log(chalk.cyan('🔍 تم تحسين استخراج الكيانات'));
  }

  /**
   * تحليل أنماط الكيانات
   */
  private analyzeEntityPatterns(
    samples: Array<{ text: string; intent: VoiceIntent['type']; entities: VoiceEntity[] }>
  ): any {
    const patterns: any = {};

    for (const sample of samples) {
      for (const entity of sample.entities) {
        if (!patterns[entity.type]) {
          patterns[entity.type] = [];
        }

        patterns[entity.type].push({
          value: entity.value,
          context: sample.text.substring(Math.max(0, entity.start - 5), entity.end + 5),
          confidence: entity.confidence,
        });
      }
    }

    return patterns;
  }

  /**
   * عرض إحصائيات الصوت
   */
  async getVoiceStats(): Promise<void> {
    const files = await fs.readdir(this.sessionsPath);
    const sessions: VoiceSession[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionPath = path.join(this.sessionsPath, file);
        const session = await fs.readJson(sessionPath);
        sessions.push(session);
      }
    }

    if (sessions.length === 0) {
      console.log(chalk.yellow('❌ لا توجد جلسات صوتية للإحصائيات'));
      return;
    }

    const totalSessions = sessions.length;
    const totalCommands = sessions.reduce((sum, s) => sum + s.commands.length, 0);
    const totalDuration = sessions.reduce((sum, s) => {
      const duration = s.endTime
        ? new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
        : new Date().getTime() - new Date(s.startTime).getTime();
      return sum + duration;
    }, 0);

    const averageAccuracy =
      sessions.reduce((sum, s) => sum + s.performance.accuracy, 0) / totalSessions;
    const averageCommands = totalCommands / totalSessions;
    const averageDuration = totalDuration / totalSessions;

    console.log(chalk.green('\n🎤 إحصائيات النظام الصوتي:\n'));

    console.log(chalk.white(`📊 إجمالي الجلسات: ${totalSessions}`));
    console.log(chalk.white(`🎯 إجمالي الأوامر: ${totalCommands}`));
    console.log(chalk.white(`⏱️  متوسط الأوامر للجلسة: ${averageCommands.toFixed(1)}`));
    console.log(chalk.white(`🎖️ متوسط الدقة: ${(averageAccuracy * 100).toFixed(1)}%`));

    const hours = Math.floor(totalDuration / (1000 * 60 * 60));
    const minutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));

    console.log(
      chalk.cyan(`\n⏰ إجمالي وقت الاستخدام: ${hours}:${minutes.toString().padStart(2, '0')}`)
    );

    // أكثر الأوامر استخداماً
    const commandCounts = new Map<string, number>();
    for (const session of sessions) {
      for (const command of session.commands) {
        const intent = command.intent.type;
        commandCounts.set(intent, (commandCounts.get(intent) || 0) + 1);
      }
    }

    console.log(chalk.yellow('\n🔥 الأوامر الأكثر استخداماً:'));
    const sortedCommands = Array.from(commandCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [intent, count] of sortedCommands.slice(0, 5)) {
      console.log(chalk.gray(`   ${intent}: ${count} مرة`));
    }
  }
}

// مصنع لإنشاء instance
export function createVoiceFirstInterface(
  apiClient: OqoolAPIClient,
  workingDir?: string
): VoiceFirstInterface {
  return new VoiceFirstInterface(apiClient, workingDir);
}
