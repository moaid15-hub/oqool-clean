import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';

/**
 * نوع المشروع
 */
export type ProjectType =
  | 'nodejs'
  | 'typescript'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'express'
  | 'nestjs'
  | 'python'
  | 'go'
  | 'rust'
  | 'other';

/**
 * إعدادات المشروع
 */
export interface ProjectConfig {
  projectType: ProjectType;
  name: string;
  description: string;
  apiKey?: string;
  apiUrl?: string;
  gitEnabled: boolean;
  aiEnabled: boolean;
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  performance: {
    parallel: boolean;
    concurrency: number;
    incremental: boolean;
  };
  features: {
    templates: boolean;
    hooks: boolean;
    review: boolean;
    docs: boolean;
    tests: boolean;
  };
  language: 'ar' | 'en';
}

/**
 * نتيجة المعالج
 */
export interface WizardResult {
  success: boolean;
  config: ProjectConfig;
  configPath: string;
  message: string;
}

/**
 * معالج الإعدادات التفاعلي
 */
export class ConfigWizard {
  private rl: readline.Interface;
  private workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * بدء المعالج التفاعلي
   */
  async start(language: 'ar' | 'en' = 'ar'): Promise<WizardResult> {
    console.log(
      language === 'ar'
        ? '\n🎯 مرحباً بك في معالج إعداد Oqool Code!\n'
        : '\n🎯 Welcome to Oqool Code Configuration Wizard!\n'
    );

    try {
      const config = await this.collectConfig(language);
      const configPath = await this.saveConfig(config);

      this.rl.close();

      return {
        success: true,
        config,
        configPath,
        message:
          language === 'ar'
            ? `✅ تم حفظ الإعدادات في: ${configPath}`
            : `✅ Configuration saved to: ${configPath}`,
      };
    } catch (error) {
      this.rl.close();

      return {
        success: false,
        config: this.getDefaultConfig(language),
        configPath: '',
        message: `❌ ${error}`,
      };
    }
  }

  /**
   * جمع الإعدادات من المستخدم
   */
  private async collectConfig(language: 'ar' | 'en'): Promise<ProjectConfig> {
    const config: ProjectConfig = {
      projectType: 'typescript',
      name: '',
      description: '',
      gitEnabled: true,
      aiEnabled: true,
      caching: {
        enabled: true,
        ttl: 3600000,
        maxSize: 100,
      },
      performance: {
        parallel: true,
        concurrency: 5,
        incremental: true,
      },
      features: {
        templates: true,
        hooks: true,
        review: true,
        docs: true,
        tests: true,
      },
      language,
    };

    // نوع المشروع
    config.projectType = await this.askProjectType(language);

    // اسم المشروع
    config.name = await this.ask(
      language === 'ar' ? 'اسم المشروع:' : 'Project name:',
      path.basename(this.workingDir)
    );

    // الوصف
    config.description = await this.ask(
      language === 'ar' ? 'وصف المشروع:' : 'Project description:',
      ''
    );

    // API Key
    const needsApi = await this.askYesNo(
      language === 'ar' ? 'هل تريد استخدام Oqool AI API؟' : 'Do you want to use Oqool AI API?',
      true
    );

    if (needsApi) {
      config.apiKey = await this.ask(language === 'ar' ? 'API Key:' : 'API Key:', '');
      config.apiUrl = await this.ask(
        language === 'ar' ? 'API URL:' : 'API URL:',
        'https://oqool.net'
      );
    }

    // Git
    config.gitEnabled = await this.askYesNo(language === 'ar' ? 'تفعيل Git؟' : 'Enable Git?', true);

    // AI
    config.aiEnabled = await this.askYesNo(
      language === 'ar' ? 'تفعيل ميزات AI؟' : 'Enable AI features?',
      true
    );

    // Caching
    config.caching.enabled = await this.askYesNo(
      language === 'ar' ? 'تفعيل التخزين المؤقت؟' : 'Enable caching?',
      true
    );

    if (config.caching.enabled) {
      const ttl = await this.ask(
        language === 'ar' ? 'مدة الصلاحية (بالثواني):' : 'TTL (seconds):',
        '3600'
      );
      config.caching.ttl = parseInt(ttl) * 1000;
    }

    // Performance
    config.performance.parallel = await this.askYesNo(
      language === 'ar' ? 'تفعيل المعالجة المتوازية؟' : 'Enable parallel processing?',
      true
    );

    if (config.performance.parallel) {
      const concurrency = await this.ask(
        language === 'ar' ? 'عدد العمليات المتزامنة:' : 'Concurrency limit:',
        '5'
      );
      config.performance.concurrency = parseInt(concurrency);
    }

    config.performance.incremental = await this.askYesNo(
      language === 'ar' ? 'تفعيل التحليل التدريجي؟' : 'Enable incremental analysis?',
      true
    );

    // Features
    console.log(language === 'ar' ? '\n📦 اختر الميزات المطلوبة:' : '\n📦 Select features:');

    config.features.templates = await this.askYesNo(
      language === 'ar' ? 'القوالب (Templates)؟' : 'Templates?',
      true
    );

    config.features.hooks = await this.askYesNo(
      language === 'ar' ? 'Git Hooks؟' : 'Git Hooks?',
      true
    );

    config.features.review = await this.askYesNo(
      language === 'ar' ? 'مراجعة الكود (Code Review)؟' : 'Code Review?',
      true
    );

    config.features.docs = await this.askYesNo(
      language === 'ar' ? 'توليد التوثيق؟' : 'Documentation generation?',
      true
    );

    config.features.tests = await this.askYesNo(
      language === 'ar' ? 'توليد الاختبارات؟' : 'Test generation?',
      true
    );

    return config;
  }

  /**
   * سؤال عن نوع المشروع
   */
  private async askProjectType(language: 'ar' | 'en'): Promise<ProjectType> {
    console.log(language === 'ar' ? '\nنوع المشروع:' : '\nProject type:');
    console.log('1. TypeScript');
    console.log('2. Node.js');
    console.log('3. React');
    console.log('4. Vue');
    console.log('5. Angular');
    console.log('6. Next.js');
    console.log('7. Express');
    console.log('8. NestJS');
    console.log('9. Python');
    console.log('10. Go');
    console.log('11. Rust');
    console.log('12. Other');

    const choice = await this.ask(language === 'ar' ? 'اختر رقم (1-12):' : 'Choose (1-12):', '1');

    const types: ProjectType[] = [
      'typescript',
      'nodejs',
      'react',
      'vue',
      'angular',
      'nextjs',
      'express',
      'nestjs',
      'python',
      'go',
      'rust',
      'other',
    ];

    const index = parseInt(choice) - 1;
    return types[index] || 'typescript';
  }

  /**
   * طرح سؤال
   */
  private async ask(question: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} [${defaultValue}] ` : `${question} `;

      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  /**
   * سؤال نعم/لا
   */
  private async askYesNo(question: string, defaultValue: boolean = true): Promise<boolean> {
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.ask(`${question} (${defaultText})`, '');

    if (!answer) return defaultValue;

    const lower = answer.toLowerCase();
    return lower === 'y' || lower === 'yes' || lower === 'نعم';
  }

  /**
   * حفظ الإعدادات
   */
  private async saveConfig(config: ProjectConfig): Promise<string> {
    const configPath = path.join(this.workingDir, 'oqool.config.json');

    const configData = {
      ...config,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
    };

    await fs.writeFile(configPath, JSON.stringify(configData, null, 2), 'utf-8');

    return configPath;
  }

  /**
   * الحصول على إعدادات افتراضية
   */
  private getDefaultConfig(language: 'ar' | 'en'): ProjectConfig {
    return {
      projectType: 'typescript',
      name: path.basename(this.workingDir),
      description: '',
      gitEnabled: true,
      aiEnabled: false,
      caching: {
        enabled: true,
        ttl: 3600000,
        maxSize: 100,
      },
      performance: {
        parallel: true,
        concurrency: 5,
        incremental: true,
      },
      features: {
        templates: true,
        hooks: true,
        review: true,
        docs: true,
        tests: true,
      },
      language,
    };
  }

  /**
   * إنشاء إعدادات سريعة
   */
  async quickSetup(
    preset: 'minimal' | 'recommended' | 'full',
    language: 'ar' | 'en' = 'ar'
  ): Promise<WizardResult> {
    let config = this.getDefaultConfig(language);

    if (preset === 'minimal') {
      config = {
        ...config,
        aiEnabled: false,
        caching: {
          enabled: false,
          ttl: 0,
          maxSize: 0,
        },
        performance: {
          parallel: false,
          concurrency: 1,
          incremental: false,
        },
        features: {
          templates: false,
          hooks: false,
          review: false,
          docs: false,
          tests: false,
        },
      };
    } else if (preset === 'recommended') {
      config = {
        ...config,
        aiEnabled: true,
        caching: {
          enabled: true,
          ttl: 3600000,
          maxSize: 50,
        },
        performance: {
          parallel: true,
          concurrency: 3,
          incremental: true,
        },
        features: {
          templates: true,
          hooks: true,
          review: true,
          docs: false,
          tests: false,
        },
      };
    } else if (preset === 'full') {
      config = {
        ...config,
        aiEnabled: true,
        caching: {
          enabled: true,
          ttl: 7200000,
          maxSize: 100,
        },
        performance: {
          parallel: true,
          concurrency: 5,
          incremental: true,
        },
        features: {
          templates: true,
          hooks: true,
          review: true,
          docs: true,
          tests: true,
        },
      };
    }

    const configPath = await this.saveConfig(config);

    return {
      success: true,
      config,
      configPath,
      message:
        language === 'ar' ? `✅ تم إنشاء إعدادات ${preset}` : `✅ Created ${preset} configuration`,
    };
  }

  /**
   * تحديث إعدادات موجودة
   */
  async updateConfig(updates: Partial<ProjectConfig>): Promise<WizardResult> {
    try {
      const configPath = path.join(this.workingDir, 'oqool.config.json');

      // قراءة الإعدادات الحالية
      let currentConfig: ProjectConfig;
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        currentConfig = JSON.parse(content);
      } catch {
        currentConfig = this.getDefaultConfig('ar');
      }

      // دمج التحديثات
      const newConfig: ProjectConfig = {
        ...currentConfig,
        ...updates,
      };

      // حفظ
      await this.saveConfig(newConfig);

      return {
        success: true,
        config: newConfig,
        configPath,
        message: '✅ تم تحديث الإعدادات',
      };
    } catch (error) {
      return {
        success: false,
        config: this.getDefaultConfig('ar'),
        configPath: '',
        message: `❌ ${error}`,
      };
    }
  }

  /**
   * قراءة الإعدادات الحالية
   */
  async loadConfig(): Promise<ProjectConfig | null> {
    try {
      const configPath = path.join(this.workingDir, 'oqool.config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * عرض الإعدادات الحالية
   */
  async showConfig(language: 'ar' | 'en' = 'ar'): Promise<void> {
    const config = await this.loadConfig();

    if (!config) {
      console.log(language === 'ar' ? '❌ لا توجد إعدادات محفوظة' : '❌ No configuration found');
      return;
    }

    console.log(language === 'ar' ? '\n📋 الإعدادات الحالية:' : '\n📋 Current Configuration:');
    console.log(JSON.stringify(config, null, 2));
  }

  /**
   * التحقق من صحة الإعدادات
   */
  async validateConfig(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const config = await this.loadConfig();

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push('Configuration file not found');
      return { valid: false, errors, warnings };
    }

    // التحقق من API
    if (config.aiEnabled && !config.apiKey) {
      warnings.push('AI enabled but no API key provided');
    }

    // التحقق من الأداء
    if (config.performance.parallel && config.performance.concurrency < 1) {
      errors.push('Concurrency must be at least 1');
    }

    if (config.performance.concurrency > 10) {
      warnings.push('High concurrency may cause performance issues');
    }

    // التحقق من التخزين المؤقت
    if (config.caching.enabled && config.caching.ttl < 0) {
      errors.push('Cache TTL cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * تصدير الإعدادات
   */
  async exportConfig(format: 'json' | 'yaml' | 'env'): Promise<string> {
    const config = await this.loadConfig();

    if (!config) {
      throw new Error('No configuration found');
    }

    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    } else if (format === 'yaml') {
      return this.convertToYAML(config);
    } else if (format === 'env') {
      return this.convertToEnv(config);
    }

    return '';
  }

  /**
   * تحويل إلى YAML
   */
  private convertToYAML(config: ProjectConfig): string {
    let yaml = '';

    yaml += `projectType: ${config.projectType}\n`;
    yaml += `name: ${config.name}\n`;
    yaml += `description: ${config.description}\n`;
    yaml += `gitEnabled: ${config.gitEnabled}\n`;
    yaml += `aiEnabled: ${config.aiEnabled}\n`;
    yaml += `\ncaching:\n`;
    yaml += `  enabled: ${config.caching.enabled}\n`;
    yaml += `  ttl: ${config.caching.ttl}\n`;
    yaml += `  maxSize: ${config.caching.maxSize}\n`;
    yaml += `\nperformance:\n`;
    yaml += `  parallel: ${config.performance.parallel}\n`;
    yaml += `  concurrency: ${config.performance.concurrency}\n`;
    yaml += `  incremental: ${config.performance.incremental}\n`;
    yaml += `\nfeatures:\n`;
    yaml += `  templates: ${config.features.templates}\n`;
    yaml += `  hooks: ${config.features.hooks}\n`;
    yaml += `  review: ${config.features.review}\n`;
    yaml += `  docs: ${config.features.docs}\n`;
    yaml += `  tests: ${config.features.tests}\n`;

    return yaml;
  }

  /**
   * تحويل إلى ENV
   */
  private convertToEnv(config: ProjectConfig): string {
    let env = '';

    env += `OQOOL_PROJECT_TYPE=${config.projectType}\n`;
    env += `OQOOL_PROJECT_NAME=${config.name}\n`;
    env += `OQOOL_GIT_ENABLED=${config.gitEnabled}\n`;
    env += `OQOOL_AI_ENABLED=${config.aiEnabled}\n`;

    if (config.apiKey) {
      env += `OQOOL_API_KEY=${config.apiKey}\n`;
    }

    if (config.apiUrl) {
      env += `OQOOL_API_URL=${config.apiUrl}\n`;
    }

    env += `OQOOL_CACHE_ENABLED=${config.caching.enabled}\n`;
    env += `OQOOL_CACHE_TTL=${config.caching.ttl}\n`;
    env += `OQOOL_PARALLEL=${config.performance.parallel}\n`;
    env += `OQOOL_CONCURRENCY=${config.performance.concurrency}\n`;

    return env;
  }

  /**
   * استيراد الإعدادات
   */
  async importConfig(source: string, format: 'json' | 'yaml' | 'env'): Promise<WizardResult> {
    try {
      let config: ProjectConfig;

      if (format === 'json') {
        config = JSON.parse(source);
      } else if (format === 'yaml') {
        config = this.parseYAML(source);
      } else if (format === 'env') {
        config = this.parseEnv(source);
      } else {
        throw new Error('Unsupported format');
      }

      const configPath = await this.saveConfig(config);

      return {
        success: true,
        config,
        configPath,
        message: '✅ Configuration imported successfully',
      };
    } catch (error) {
      return {
        success: false,
        config: this.getDefaultConfig('ar'),
        configPath: '',
        message: `❌ ${error}`,
      };
    }
  }

  /**
   * تحليل YAML
   */
  private parseYAML(yaml: string): ProjectConfig {
    // تحليل YAML بسيط (للإنتاج استخدم مكتبة yaml)
    const config = this.getDefaultConfig('ar');

    const lines = yaml.split('\n');
    for (const line of lines) {
      const [key, value] = line.split(':').map((s) => s.trim());
      // ... تحليل الحقول
    }

    return config;
  }

  /**
   * تحليل ENV
   */
  private parseEnv(env: string): ProjectConfig {
    const config = this.getDefaultConfig('ar');

    const lines = env.split('\n');
    for (const line of lines) {
      const [key, value] = line.split('=');

      if (key === 'OQOOL_PROJECT_TYPE') {
        config.projectType = value as ProjectType;
      } else if (key === 'OQOOL_PROJECT_NAME') {
        config.name = value;
      } else if (key === 'OQOOL_API_KEY') {
        config.apiKey = value;
      }
      // ... باقي الحقول
    }

    return config;
  }
}

/**
 * إنشاء معالج إعدادات
 */
export function createConfigWizard(workingDir: string): ConfigWizard {
  return new ConfigWizard(workingDir);
}
