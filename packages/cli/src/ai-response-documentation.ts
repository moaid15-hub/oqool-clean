// ai-response-documentation.ts
// ============================================
// 📚 نظام التوثيق التلقائي لردود AI
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface AIDocumentation {
  timestamp: string;
  prompt: string;
  response: string;
  filesGenerated: string[];
  filesModified: string[];
  language?: string;
  provider?: string;
  executionTime?: number;
  tags: string[];
  rating?: number; // تقييم المستخدم
}

export interface DocumentationConfig {
  enabled: boolean;
  outputDir: string;
  maxEntries: number;
  includeCode: boolean;
  includeMetadata: boolean;
  autoGenerate: boolean;
}

export class AIResponseDocumentation {
  private config: DocumentationConfig;
  private documentationPath: string;

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      enabled: true,
      outputDir: '.oqool-docs',
      maxEntries: 1000,
      includeCode: true,
      includeMetadata: true,
      autoGenerate: true,
      ...config,
    };

    this.documentationPath = path.join(process.cwd(), this.config.outputDir);
    this.initializeDocumentation();
  }

  /**
   * تهيئة نظام التوثيق
   */
  private async initializeDocumentation(): Promise<void> {
    try {
      await fs.ensureDir(this.documentationPath);

      // إنشاء ملف التكوين
      const configPath = path.join(this.documentationPath, 'config.json');
      await fs.writeJson(configPath, this.config, { spaces: 2 });

      // إنشاء ملف index
      const indexPath = path.join(this.documentationPath, 'README.md');
      if (!(await fs.pathExists(indexPath))) {
        await this.createIndexFile();
      }
    } catch (error) {
      console.error(chalk.red('❌ فشل في تهيئة نظام التوثيق:'), error);
    }
  }

  /**
   * إنشاء ملف الفهرس
   */
  private async createIndexFile(): Promise<void> {
    const indexContent = `# 📚 توثيق ردود Oqool AI

## 🌟 نظرة عامة

هذا المجلد يحتوي على توثيق تلقائي لجميع تفاعلاتك مع Oqool AI.

## 📂 البنية

\`\`\`
.oqool-docs/
├── responses/
│   ├── 2025-01-24_001.json
│   ├── 2025-01-24_002.json
│   └── ...
├── sessions/
│   ├── session_001.md
│   └── ...
├── index.json          # فهرس جميع الردود
├── config.json         # إعدادات النظام
└── README.md          # هذا الملف
\`\`\`

## 📊 الإحصائيات

- **إجمالي الردود:** 0
- **اللغات المدعومة:** JavaScript, TypeScript, Python, Go, Rust, Ruby, PHP
- **المزودين:** OpenAI, Claude, DeepSeek

## 🔍 البحث والتنقل

استخدم الأوامر التالية للبحث في التوثيق:

\`\`\`bash
oqool-code docs search "express api"
oqool-code docs stats
oqool-code docs export --format json
\`\`\`

## 📝 كيفية الاستخدام

التوثيق يتم تلقائياً عند كل تفاعل مع AI. يمكنك:

1. **مراجعة الردود السابقة**
2. **البحث في المحتوى**
3. **تصدير التوثيق**
4. **تقييم جودة الردود**

## ⚙️ التخصيص

يمكنك تخصيص سلوك التوثيق من خلال ملف \`config.json\`.

---

*صُنع بـ ❤️ بواسطة Oqool AI Team*
`;

    await fs.writeFile(path.join(this.documentationPath, 'README.md'), indexContent);
  }

  /**
   * توثيق رد AI
   */
  async documentResponse(
    prompt: string,
    response: string,
    metadata: {
      filesGenerated?: string[];
      filesModified?: string[];
      language?: string;
      provider?: string;
      executionTime?: number;
      tags?: string[];
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const documentation: AIDocumentation = {
        timestamp: new Date().toISOString(),
        prompt,
        response,
        filesGenerated: metadata.filesGenerated || [],
        filesModified: metadata.filesModified || [],
        language: metadata.language,
        provider: metadata.provider,
        executionTime: metadata.executionTime,
        tags: metadata.tags || [],
        rating: undefined,
      };

      // إنشاء اسم ملف فريد
      const timestamp = new Date().toISOString().split('T')[0];
      const time = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
      const fileName = `${timestamp}_${time}.json`;
      const filePath = path.join(this.documentationPath, 'responses', fileName);

      // حفظ التوثيق
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, documentation, { spaces: 2 });

      // تحديث الفهرس
      await this.updateIndex(documentation);

      // إنشاء جلسة إذا لزم الأمر
      if (this.config.autoGenerate) {
        await this.generateSessionSummary();
      }

      console.log(chalk.gray(`📚 تم حفظ التوثيق: ${fileName}`));
    } catch (error) {
      console.error(chalk.red('❌ فشل في حفظ التوثيق:'), error);
    }
  }

  /**
   * تحديث ملف الفهرس
   */
  private async updateIndex(documentation: AIDocumentation): Promise<void> {
    try {
      const indexPath = path.join(this.documentationPath, 'index.json');

      let index: AIDocumentation[] = [];
      if (await fs.pathExists(indexPath)) {
        index = await fs.readJson(indexPath);
      }

      // إضافة التوثيق الجديد
      index.unshift(documentation);

      // الحد من عدد الإدخالات
      if (index.length > this.config.maxEntries) {
        index = index.slice(0, this.config.maxEntries);
      }

      await fs.writeJson(indexPath, index, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('❌ فشل في تحديث الفهرس:'), error);
    }
  }

  /**
   * إنشاء ملخص الجلسة
   */
  private async generateSessionSummary(): Promise<void> {
    try {
      const sessionsPath = path.join(this.documentationPath, 'sessions');

      // الحصول على الجلسة الحالية
      const today = new Date().toISOString().split('T')[0];
      const sessionFile = path.join(sessionsPath, `session_${today}.md`);

      // قراءة التوثيقات لليوم الحالي
      const indexPath = path.join(this.documentationPath, 'index.json');
      let allDocs: AIDocumentation[] = [];

      if (await fs.pathExists(indexPath)) {
        allDocs = await fs.readJson(indexPath);
      }

      // فلترة توثيقات اليوم
      const todayDocs = allDocs.filter((doc) => doc.timestamp.startsWith(today));

      if (todayDocs.length === 0) return;

      // إنشاء ملخص الجلسة
      let sessionContent = `# 📋 ملخص جلسة ${today}\n\n`;
      sessionContent += `**الإجمالي:** ${todayDocs.length} تفاعل\n\n`;

      // إحصائيات حسب اللغة
      const languageStats = new Map<string, number>();
      const providerStats = new Map<string, number>();
      const tagStats = new Map<string, number>();

      for (const doc of todayDocs) {
        if (doc.language) {
          languageStats.set(doc.language, (languageStats.get(doc.language) || 0) + 1);
        }

        if (doc.provider) {
          providerStats.set(doc.provider, (providerStats.get(doc.provider) || 0) + 1);
        }

        for (const tag of doc.tags) {
          tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
        }
      }

      if (languageStats.size > 0) {
        sessionContent += `## 🌍 اللغات المستخدمة\n\n`;
        for (const [lang, count] of languageStats.entries()) {
          sessionContent += `- **${lang}:** ${count}\n`;
        }
        sessionContent += `\n`;
      }

      if (providerStats.size > 0) {
        sessionContent += `## 🤖 المزودين\n\n`;
        for (const [provider, count] of providerStats.entries()) {
          sessionContent += `- **${provider}:** ${count}\n`;
        }
        sessionContent += `\n`;
      }

      if (tagStats.size > 0) {
        sessionContent += `## 🏷️ العلامات الأكثر استخداماً\n\n`;
        const sortedTags = Array.from(tagStats.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        for (const [tag, count] of sortedTags) {
          sessionContent += `- **${tag}:** ${count}\n`;
        }
        sessionContent += `\n`;
      }

      // قائمة بالتفاعلات
      sessionContent += `## 📝 التفاعلات\n\n`;
      for (let i = 0; i < todayDocs.length; i++) {
        const doc = todayDocs[i];
        const time = new Date(doc.timestamp).toLocaleTimeString('ar');
        sessionContent += `### ${i + 1}. ${time}\n\n`;
        sessionContent += `**الطلب:** ${doc.prompt.substring(0, 100)}...\n\n`;
        sessionContent += `**المزود:** ${doc.provider || 'غير محدد'}\n`;
        sessionContent += `**اللغة:** ${doc.language || 'غير محدد'}\n`;
        sessionContent += `**الملفات:** ${doc.filesGenerated.length + doc.filesModified.length}\n\n`;
      }

      await fs.ensureDir(sessionsPath);
      await fs.writeFile(sessionFile, sessionContent);
    } catch (error) {
      console.error(chalk.red('❌ فشل في إنشاء ملخص الجلسة:'), error);
    }
  }

  /**
   * البحث في التوثيق
   */
  async searchDocumentation(query: string): Promise<AIDocumentation[]> {
    try {
      const indexPath = path.join(this.documentationPath, 'index.json');

      if (!(await fs.pathExists(indexPath))) {
        return [];
      }

      const allDocs: AIDocumentation[] = await fs.readJson(indexPath);

      const searchTerm = query.toLowerCase();

      return allDocs.filter(
        (doc) =>
          doc.prompt.toLowerCase().includes(searchTerm) ||
          doc.response.toLowerCase().includes(searchTerm) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
          (doc.language && doc.language.toLowerCase().includes(searchTerm)) ||
          (doc.provider && doc.provider.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error(chalk.red('❌ فشل في البحث:'), error);
      return [];
    }
  }

  /**
   * عرض إحصائيات التوثيق
   */
  async getStatistics(): Promise<{
    totalInteractions: number;
    languagesUsed: Map<string, number>;
    providersUsed: Map<string, number>;
    averageExecutionTime: number;
    mostCommonTags: Array<[string, number]>;
  }> {
    try {
      const indexPath = path.join(this.documentationPath, 'index.json');

      if (!(await fs.pathExists(indexPath))) {
        return {
          totalInteractions: 0,
          languagesUsed: new Map(),
          providersUsed: new Map(),
          averageExecutionTime: 0,
          mostCommonTags: [],
        };
      }

      const allDocs: AIDocumentation[] = await fs.readJson(indexPath);

      const languagesUsed = new Map<string, number>();
      const providersUsed = new Map<string, number>();
      const tagCounts = new Map<string, number>();
      let totalExecutionTime = 0;
      let executionCount = 0;

      for (const doc of allDocs) {
        if (doc.language) {
          languagesUsed.set(doc.language, (languagesUsed.get(doc.language) || 0) + 1);
        }

        if (doc.provider) {
          providersUsed.set(doc.provider, (providersUsed.get(doc.provider) || 0) + 1);
        }

        for (const tag of doc.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }

        if (doc.executionTime) {
          totalExecutionTime += doc.executionTime;
          executionCount++;
        }
      }

      const mostCommonTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return {
        totalInteractions: allDocs.length,
        languagesUsed,
        providersUsed,
        averageExecutionTime: executionCount > 0 ? totalExecutionTime / executionCount : 0,
        mostCommonTags,
      };
    } catch (error) {
      console.error(chalk.red('❌ فشل في الحصول على الإحصائيات:'), error);
      return {
        totalInteractions: 0,
        languagesUsed: new Map(),
        providersUsed: new Map(),
        averageExecutionTime: 0,
        mostCommonTags: [],
      };
    }
  }

  /**
   * تصدير التوثيق
   */
  async exportDocumentation(format: 'json' | 'csv' | 'markdown'): Promise<string> {
    try {
      const indexPath = path.join(this.documentationPath, 'index.json');

      if (!(await fs.pathExists(indexPath))) {
        throw new Error('لا يوجد توثيق للتصدير');
      }

      const allDocs: AIDocumentation[] = await fs.readJson(indexPath);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportPath = path.join(this.documentationPath, `export_${timestamp}`);

      switch (format) {
        case 'json':
          await fs.writeJson(`${exportPath}.json`, allDocs, { spaces: 2 });
          break;

        case 'csv':
          await this.exportAsCSV(allDocs, `${exportPath}.csv`);
          break;

        case 'markdown':
          await this.exportAsMarkdown(allDocs, `${exportPath}.md`);
          break;
      }

      return `${exportPath}.${format}`;
    } catch (error) {
      console.error(chalk.red('❌ فشل في التصدير:'), error);
      throw error;
    }
  }

  /**
   * تصدير كـ CSV
   */
  private async exportAsCSV(docs: AIDocumentation[], filePath: string): Promise<void> {
    const headers = [
      'timestamp',
      'prompt',
      'language',
      'provider',
      'executionTime',
      'filesGenerated',
      'filesModified',
      'tags',
    ];
    let csv = headers.join(',') + '\n';

    for (const doc of docs) {
      const row = [
        doc.timestamp,
        `"${doc.prompt.replace(/"/g, '""')}"`,
        doc.language || '',
        doc.provider || '',
        doc.executionTime || '',
        doc.filesGenerated.join(';'),
        doc.filesModified.join(';'),
        doc.tags.join(';'),
      ];
      csv += row.join(',') + '\n';
    }

    await fs.writeFile(filePath, csv);
  }

  /**
   * تصدير كـ Markdown
   */
  private async exportAsMarkdown(docs: AIDocumentation[], filePath: string): Promise<void> {
    let markdown = '# 📚 تصدير توثيق Oqool AI\n\n';
    markdown += `**تاريخ التصدير:** ${new Date().toLocaleString('ar')}\n`;
    markdown += `**عدد التفاعلات:** ${docs.length}\n\n`;

    markdown += '---\n\n';

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      markdown += `## ${i + 1}. ${new Date(doc.timestamp).toLocaleString('ar')}\n\n`;
      markdown += `**الطلب:** ${doc.prompt}\n\n`;
      markdown += `**الرد:**\n${doc.response}\n\n`;

      if (doc.language || doc.provider) {
        markdown += `**المعلومات التقنية:**\n`;
        if (doc.language) markdown += `- اللغة: ${doc.language}\n`;
        if (doc.provider) markdown += `- المزود: ${doc.provider}\n`;
        if (doc.executionTime) markdown += `- وقت التنفيذ: ${doc.executionTime}ms\n`;
        markdown += '\n';
      }

      if (doc.filesGenerated.length > 0) {
        markdown += `**الملفات المُنشأة:**\n`;
        for (const file of doc.filesGenerated) {
          markdown += `- ${file}\n`;
        }
        markdown += '\n';
      }

      if (doc.filesModified.length > 0) {
        markdown += `**الملفات المُعدلة:**\n`;
        for (const file of doc.filesModified) {
          markdown += `- ${file}\n`;
        }
        markdown += '\n';
      }

      if (doc.tags.length > 0) {
        markdown += `**العلامات:** ${doc.tags.join(', ')}\n\n`;
      }

      markdown += '---\n\n';
    }

    await fs.writeFile(filePath, markdown);
  }

  /**
   * تحديث التكوين
   */
  async updateConfig(newConfig: Partial<DocumentationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    const configPath = path.join(this.documentationPath, 'config.json');
    await fs.writeJson(configPath, this.config, { spaces: 2 });
  }
}

// مصنع لإنشاء instance
export function createAIDocumentation(
  config?: Partial<DocumentationConfig>
): AIResponseDocumentation {
  return new AIResponseDocumentation(config);
}
