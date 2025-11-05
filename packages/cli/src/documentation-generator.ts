// documentation-generator.ts
// ============================================
// 📚 Documentation Generator
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { OqoolAPIClient } from './api-client.js';
import { FileManager } from './file-manager.js';

export interface DocumentationConfig {
  enabled: boolean;
  outputDir: string;
  format: 'markdown' | 'html' | 'json' | 'all';
  includeCode: boolean;
  includeMetrics: boolean;
  includeDependencies: boolean;
  includeSetup: boolean;
  includeExamples: boolean;
  language: 'ar' | 'en' | 'both';
  template: string;
}

export interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  repository: string;
  keywords: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  level: number;
  children: DocumentationSection[];
  metadata: {
    generated: boolean;
    source: string;
    confidence: number;
    lastUpdated: string;
  };
}

export interface GeneratedDocumentation {
  id: string;
  title: string;
  description: string;
  sections: DocumentationSection[];
  metadata: {
    generatedAt: string;
    generator: string;
    version: string;
    format: string;
    language: string;
  };
  files: string[];
  size: number;
  completeness: number;
}

export class DocumentationGenerator {
  private apiClient: OqoolAPIClient;
  private fileManager: FileManager;
  private workingDir: string;
  private config: DocumentationConfig;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.fileManager = new FileManager(workingDir);
    this.workingDir = workingDir;
    this.config = this.loadDefaultConfig();
    this.initializeSystem();
  }

  /**
   * تحميل التكوين الافتراضي
   */
  private loadDefaultConfig(): DocumentationConfig {
    return {
      enabled: true,
      outputDir: 'docs',
      format: 'markdown',
      includeCode: true,
      includeMetrics: true,
      includeDependencies: true,
      includeSetup: true,
      includeExamples: true,
      language: 'ar',
      template: 'default',
    };
  }

  /**
   * تهيئة النظام
   */
  private async initializeSystem(): Promise<void> {
    await fs.ensureDir(path.join(this.workingDir, this.config.outputDir));
  }

  /**
   * توليد التوثيق الشامل للمشروع
   */
  async generateProjectDocumentation(): Promise<GeneratedDocumentation> {
    const spinner = ora('توليد التوثيق...').start();

    try {
      // جمع معلومات المشروع
      const projectInfo = await this.extractProjectInfo();

      // تحليل بنية المشروع
      const projectStructure = await this.analyzeProjectStructure();

      // استخراج الكود والدوال
      const codeAnalysis = await this.analyzeCodebase();

      // توليد الأقسام المختلفة
      const sections = await this.generateDocumentationSections(
        projectInfo,
        projectStructure,
        codeAnalysis
      );

      // إنشاء الملفات
      const files = await this.generateDocumentationFiles(sections);

      const documentation: GeneratedDocumentation = {
        id: this.generateId(),
        title: projectInfo.name || 'Project Documentation',
        description: projectInfo.description || 'Generated documentation for the project',
        sections,
        metadata: {
          generatedAt: new Date().toISOString(),
          generator: 'Oqool Code Documentation Generator',
          version: '2.5.0',
          format: this.config.format,
          language: this.config.language,
        },
        files,
        size: files.length,
        completeness: this.calculateCompleteness(sections),
      };

      await this.saveDocumentationIndex(documentation);

      spinner.succeed('تم توليد التوثيق بنجاح!');

      console.log(chalk.green(`\n📚 التوثيق المُولد:`));
      console.log(chalk.cyan(`   العنوان: ${documentation.title}`));
      console.log(chalk.white(`   الأقسام: ${sections.length}`));
      console.log(chalk.white(`   الملفات: ${files.length}`));
      console.log(chalk.white(`   الاكتمال: ${(documentation.completeness * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   المجلد: ${this.config.outputDir}\n`));

      return documentation;
    } catch (error) {
      spinner.fail('فشل في توليد التوثيق');
      throw error;
    }
  }

  /**
   * استخراج معلومات المشروع
   */
  private async extractProjectInfo(): Promise<ProjectInfo> {
    try {
      const packagePath = path.join(this.workingDir, 'package.json');

      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJson(packagePath);

        return {
          name: packageJson.name || 'Unknown Project',
          version: packageJson.version || '1.0.0',
          description: packageJson.description || '',
          author: packageJson.author || '',
          license: packageJson.license || 'MIT',
          repository: packageJson.repository?.url || '',
          keywords: packageJson.keywords || [],
          scripts: packageJson.scripts || {},
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
        };
      }

      // معلومات افتراضية إذا لم يكن هناك package.json
      return {
        name: path.basename(this.workingDir),
        version: '1.0.0',
        description: 'Project generated with Oqool Code',
        author: 'Oqool AI',
        license: 'MIT',
        repository: '',
        keywords: [],
        scripts: {},
        dependencies: {},
        devDependencies: {},
      };
    } catch (error) {
      console.error(chalk.red('❌ فشل في قراءة معلومات المشروع:'), error);
      return {
        name: 'Project',
        version: '1.0.0',
        description: '',
        author: '',
        license: 'MIT',
        repository: '',
        keywords: [],
        scripts: {},
        dependencies: {},
        devDependencies: {},
      };
    }
  }

  /**
   * تحليل بنية المشروع
   */
  private async analyzeProjectStructure(): Promise<any> {
    try {
      const structure = await this.fileManager.getDirectoryStructure(3);

      return {
        root: structure,
        totalFiles: this.countFiles(structure),
        totalDirectories: this.countDirectories(structure),
        mainLanguages: await this.detectMainLanguages(),
        complexity: await this.assessComplexity(),
      };
    } catch (error) {
      console.error(chalk.red('❌ فشل في تحليل بنية المشروع:'), error);
      return { root: {}, totalFiles: 0, totalDirectories: 0 };
    }
  }

  /**
   * تحليل قاعدة الكود
   */
  private async analyzeCodebase(): Promise<any> {
    try {
      const context = await this.fileManager.getProjectContext(50);

      return {
        files: context.files,
        totalSize: context.totalSize,
        mainLanguage: this.detectPrimaryLanguage(context.files),
        complexity: this.calculateCodeComplexity(context.files),
        quality: this.assessCodeQuality(context.files),
      };
    } catch (error) {
      console.error(chalk.red('❌ فشل في تحليل قاعدة الكود:'), error);
      return { files: [], totalSize: 0 };
    }
  }

  /**
   * توليد أقسام التوثيق
   */
  private async generateDocumentationSections(
    projectInfo: ProjectInfo,
    structure: any,
    codeAnalysis: any
  ): Promise<DocumentationSection[]> {
    const sections: DocumentationSection[] = [];

    // قسم المقدمة
    sections.push({
      id: 'introduction',
      title: 'المقدمة',
      content: await this.generateIntroductionSection(projectInfo),
      level: 1,
      children: [],
      metadata: {
        generated: true,
        source: 'project-info',
        confidence: 0.9,
        lastUpdated: new Date().toISOString(),
      },
    });

    // قسم التثبيت والإعداد
    if (this.config.includeSetup) {
      sections.push({
        id: 'installation',
        title: 'التثبيت والإعداد',
        content: await this.generateInstallationSection(projectInfo),
        level: 1,
        children: [],
        metadata: {
          generated: true,
          source: 'package-scripts',
          confidence: 0.8,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // قسم الاستخدام
    sections.push({
      id: 'usage',
      title: 'الاستخدام',
      content: await this.generateUsageSection(projectInfo),
      level: 1,
      children: [],
      metadata: {
        generated: true,
        source: 'scripts-analysis',
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
    });

    // قسم بنية المشروع
    sections.push({
      id: 'structure',
      title: 'بنية المشروع',
      content: await this.generateStructureSection(structure),
      level: 1,
      children: [],
      metadata: {
        generated: true,
        source: 'file-structure',
        confidence: 0.95,
        lastUpdated: new Date().toISOString(),
      },
    });

    // قسم API Reference
    if (this.config.includeCode) {
      sections.push({
        id: 'api-reference',
        title: 'مرجع API',
        content: await this.generateAPIReferenceSection(codeAnalysis),
        level: 1,
        children: [],
        metadata: {
          generated: true,
          source: 'code-analysis',
          confidence: 0.75,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // قسم التبعيات
    if (this.config.includeDependencies) {
      sections.push({
        id: 'dependencies',
        title: 'التبعيات',
        content: await this.generateDependenciesSection(projectInfo),
        level: 1,
        children: [],
        metadata: {
          generated: true,
          source: 'package-json',
          confidence: 0.95,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // قسم المقاييس
    if (this.config.includeMetrics) {
      sections.push({
        id: 'metrics',
        title: 'المقاييس والإحصائيات',
        content: await this.generateMetricsSection(codeAnalysis),
        level: 1,
        children: [],
        metadata: {
          generated: true,
          source: 'code-metrics',
          confidence: 0.8,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    // قسم المساهمة
    sections.push({
      id: 'contributing',
      title: 'المساهمة',
      content: await this.generateContributingSection(),
      level: 1,
      children: [],
      metadata: {
        generated: true,
        source: 'template',
        confidence: 0.9,
        lastUpdated: new Date().toISOString(),
      },
    });

    return sections;
  }

  /**
   * توليد قسم المقدمة
   */
  private async generateIntroductionSection(projectInfo: ProjectInfo): Promise<string> {
    let content = `# ${projectInfo.name}\n\n`;
    content += `> ${projectInfo.description}\n\n`;

    content += `## نظرة عامة\n\n`;
    content += `هذا المشروع مُولد باستخدام **Oqool Code** - أداة الذكاء الاصطناعي المتقدمة لتطوير البرمجيات.\n\n`;

    content += `### المعلومات الأساسية\n\n`;
    content += `- **الإصدار**: ${projectInfo.version}\n`;
    content += `- **المؤلف**: ${projectInfo.author}\n`;
    content += `- **الترخيص**: ${projectInfo.license}\n`;

    if (projectInfo.keywords.length > 0) {
      content += `- **الكلمات المفتاحية**: ${projectInfo.keywords.join(', ')}\n`;
    }

    if (projectInfo.repository) {
      content += `- **المستودع**: ${projectInfo.repository}\n`;
    }

    content += `\n`;

    content += `## المميزات الرئيسية\n\n`;
    content += `- 🚀 تطوير سريع وذكي\n`;
    content += `- 🤖 دعم الذكاء الاصطناعي\n`;
    content += `- 🌍 واجهة عربية كاملة\n`;
    content += `- 🔒 أمان متقدم\n`;
    content += `- 📊 تحليلات شاملة\n`;
    content += `- 👥 تعاون ذكي\n\n`;

    return content;
  }

  /**
   * توليد قسم التثبيت
   */
  private async generateInstallationSection(projectInfo: ProjectInfo): Promise<string> {
    let content = `## التثبيت والإعداد\n\n`;

    content += `### المتطلبات الأساسية\n\n`;
    content += `- Node.js 18.0 أو أحدث\n`;
    content += `- npm أو yarn أو pnpm\n`;
    content += `- Git (اختياري)\n\n`;

    content += `### خطوات التثبيت\n\n`;
    content += `\`\`\`bash\n`;
    content += `# 1. استنساخ المشروع\n`;
    content += `git clone ${projectInfo.repository || '<repository-url>'}\n`;
    content += `cd ${projectInfo.name}\n\n`;
    content += `# 2. تثبيت التبعيات\n`;
    content += `npm install\n\n`;

    if (projectInfo.scripts?.build) {
      content += `# 3. بناء المشروع\n`;
      content += `npm run build\n\n`;
    }

    if (projectInfo.scripts?.start) {
      content += `# 4. تشغيل المشروع\n`;
      content += `npm start\n`;
    }

    content += `\`\`\`\n\n`;

    content += `### التحقق من التثبيت\n\n`;
    content += `\`\`\`bash\n`;
    content += `# التحقق من الإصدار\n`;
    content += `npm --version\n`;
    content += `node --version\n\n`;

    if (projectInfo.scripts?.test) {
      content += `# تشغيل الاختبارات\n`;
      content += `npm test\n`;
    }

    content += `\`\`\`\n\n`;

    return content;
  }

  /**
   * توليد قسم الاستخدام
   */
  private async generateUsageSection(projectInfo: ProjectInfo): Promise<string> {
    let content = `## الاستخدام\n\n`;

    content += `### البدء السريع\n\n`;
    content += `\`\`\`bash\n`;
    content += `# تشغيل المشروع\n`;
    if (projectInfo.scripts?.start) {
      content += `npm start\n`;
    } else {
      content += `# أو تشغيل مباشرة\n`;
      content += `node src/index.js\n`;
    }
    content += `\`\`\`\n\n`;

    content += `### الأوامر المتاحة\n\n`;

    if (projectInfo.scripts) {
      content += `#### Scripts المحددة:\n\n`;
      for (const [script, command] of Object.entries(projectInfo.scripts)) {
        content += `- **${script}**: \`${command}\`\n`;
      }
      content += `\n`;
    }

    content += `#### أوامر Oqool Code:\n\n`;
    content += `- \`oqool-code generate\` - توليد كود جديد\n`;
    content += `- \`oqool-code analyze\` - تحليل الكود\n`;
    content += `- \`oqool-code run\` - تشغيل الكود\n`;
    content += `- \`oqool-code patch\` - تعديل دقيق\n`;
    content += `- \`oqool-code chat\` - محادثة تفاعلية\n\n`;

    content += `### أمثلة الاستخدام\n\n`;
    content += `\`\`\`bash\n`;
    content += `# توليد API بسيط\n`;
    content += `oqool-code "اصنع API بسيط بـ Express.js"\n\n`;
    content += `# تحليل الكود\n`;
    content += `oqool-code analyze src/**/*.js\n\n`;
    content += `# تشغيل آمن\n`;
    content += `oqool-code run src/app.js --sandbox\n`;
    content += `\`\`\`\n\n`;

    return content;
  }

  /**
   * توليد قسم البنية
   */
  private async generateStructureSection(structure: any): Promise<string> {
    let content = `## بنية المشروع\n\n`;

    content += `### نظرة عامة على البنية\n\n`;
    content += `- **إجمالي الملفات**: ${structure.totalFiles}\n`;
    content += `- **إجمالي المجلدات**: ${structure.totalDirectories}\n`;
    content += `- **اللغة الرئيسية**: ${structure.mainLanguages?.[0] || 'غير محدد'}\n`;
    content += `- **مستوى التعقيد**: ${structure.complexity || 'متوسط'}\n\n`;

    content += `### شجرة الملفات\n\n`;
    content += this.generateTreeText(structure.root, '', 0);
    content += `\n`;

    return content;
  }

  /**
   * توليد قسم مرجع API
   */
  private async generateAPIReferenceSection(codeAnalysis: any): Promise<string> {
    let content = `## مرجع API\n\n`;

    if (!codeAnalysis.files || codeAnalysis.files.length === 0) {
      content += `لم يتم العثور على ملفات كود لتحليلها.\n\n`;
      return content;
    }

    content += `### الملفات الرئيسية\n\n`;

    for (const file of codeAnalysis.files.slice(0, 10)) {
      content += `#### ${file.path}\n\n`;
      content += `\`\`\`${this.getLanguageFromPath(file.path)}\n`;
      content += file.content.substring(0, 500);
      if (file.content.length > 500) {
        content += '\n... (الملف أطول من ذلك)';
      }
      content += `\n\`\`\`\n\n`;
    }

    if (codeAnalysis.files.length > 10) {
      content += `*... و ${codeAnalysis.files.length - 10} ملفات أخرى*\n\n`;
    }

    return content;
  }

  /**
   * توليد قسم التبعيات
   */
  private async generateDependenciesSection(projectInfo: ProjectInfo): Promise<string> {
    let content = `## التبعيات\n\n`;

    if (Object.keys(projectInfo.dependencies).length === 0) {
      content += `لا توجد تبعيات محددة.\n\n`;
      return content;
    }

    content += `### Dependencies\n\n`;
    for (const [dep, version] of Object.entries(projectInfo.dependencies)) {
      content += `- **${dep}**: ${version}\n`;
    }

    content += `\n### DevDependencies\n\n`;
    for (const [dep, version] of Object.entries(projectInfo.devDependencies)) {
      content += `- **${dep}**: ${version}\n`;
    }

    content += `\n### تثبيت التبعيات\n\n`;
    content += `\`\`\`bash\n`;
    content += `npm install\n`;
    content += `\`\`\`\n\n`;

    return content;
  }

  /**
   * توليد قسم المقاييس
   */
  private async generateMetricsSection(codeAnalysis: any): Promise<string> {
    let content = `## المقاييس والإحصائيات\n\n`;

    if (!codeAnalysis.files) {
      content += `لم يتم تحليل المقاييس بعد.\n\n`;
      return content;
    }

    content += `### إحصائيات عامة\n\n`;
    content += `- **إجمالي الملفات**: ${codeAnalysis.files.length}\n`;
    content += `- **الحجم الإجمالي**: ${this.formatBytes(codeAnalysis.totalSize)}\n`;
    content += `- **اللغة الرئيسية**: ${codeAnalysis.mainLanguage || 'غير محدد'}\n`;
    content += `- **مستوى التعقيد**: ${codeAnalysis.complexity || 'متوسط'}\n`;
    content += `- **مستوى الجودة**: ${codeAnalysis.quality || 'جيد'}\n\n`;

    content += `### تحليل الملفات\n\n`;
    content += `| الملف | الحجم | الأسطر | التعقيد |\n`;
    content += `|--------|-------|--------|----------|\n`;

    for (const file of codeAnalysis.files.slice(0, 10)) {
      const lines = file.content.split('\n').length;
      const size = this.formatBytes(file.size);
      content += `| ${file.path} | ${size} | ${lines} | متوسط |\n`;
    }

    content += `\n`;

    return content;
  }

  /**
   * توليد قسم المساهمة
   */
  private async generateContributingSection(): Promise<string> {
    let content = `## المساهمة في المشروع\n\n`;

    content += `### كيفية المساهمة\n\n`;
    content += `1. Fork المشروع\n`;
    content += `2. أنشئ branch جديد (\`git checkout -b feature/amazing-feature\`)\n`;
    content += `3. Commit التغييرات (\`git commit -m 'Add amazing feature'\`)\n`;
    content += `4. Push للـ branch (\`git push origin feature/amazing-feature\`)\n`;
    content += `5. افتح Pull Request\n\n`;

    content += `### إرشادات المساهمة\n\n`;
    content += `- اتبع أسلوب الكود المحدد\n`;
    content += `- أضف اختبارات للميزات الجديدة\n`;
    content += `- حدث التوثيق عند الحاجة\n`;
    content += `- تأكد من اجتياز جميع الاختبارات\n`;
    content += `- كن ودوداً ومساعداً في المناقشات\n\n`;

    content += `### أدوات التطوير\n\n`;
    content += `- **الكود**: TypeScript/JavaScript\n`;
    content += `- **الاختبارات**: Jest\n`;
    content += `- **التنسيق**: Prettier\n`;
    content += `- **الفحص**: ESLint\n`;
    content += `- **البناء**: TypeScript Compiler\n\n`;

    return content;
  }

  /**
   * توليد ملفات التوثيق
   */
  private async generateDocumentationFiles(sections: DocumentationSection[]): Promise<string[]> {
    const files: string[] = [];
    const outputDir = path.join(this.workingDir, this.config.outputDir);

    // ملف README الرئيسي
    const readmeContent = await this.generateReadmeContent(sections);
    const readmePath = path.join(outputDir, 'README.md');
    await fs.writeFile(readmePath, readmeContent);
    files.push('README.md');

    // ملفات الأقسام المنفصلة
    for (const section of sections) {
      const fileName = `${section.id}.md`;
      const sectionContent = await this.generateSectionContent(section);
      const sectionPath = path.join(outputDir, fileName);
      await fs.writeFile(sectionPath, sectionContent);
      files.push(fileName);
    }

    // ملف الفهرس
    const indexContent = await this.generateIndexContent(sections);
    const indexPath = path.join(outputDir, 'INDEX.md');
    await fs.writeFile(indexPath, indexContent);
    files.push('INDEX.md');

    return files;
  }

  /**
   * توليد محتوى README
   */
  private async generateReadmeContent(sections: DocumentationSection[]): Promise<string> {
    let content = `# ${sections[0]?.title || 'Project Documentation'}\n\n`;

    // المقدمة
    const introSection = sections.find((s) => s.id === 'introduction');
    if (introSection) {
      content += introSection.content;
    }

    // فهرس المحتويات
    content += `## فهرس المحتويات\n\n`;
    for (const section of sections) {
      const indent = '  '.repeat(section.level - 1);
      content += `${indent}- [${section.title}](#${section.id})\n`;
    }
    content += `\n`;

    // باقي الأقسام
    for (const section of sections) {
      if (section.id !== 'introduction') {
        content += section.content;
      }
    }

    content += `---\n\n`;
    content += `*تم توليد هذا التوثيق بواسطة Oqool Code Documentation Generator*\n`;
    content += `*تاريخ التوليد: ${new Date().toLocaleString('ar')}*\n`;

    return content;
  }

  /**
   * توليد محتوى قسم منفصل
   */
  private async generateSectionContent(section: DocumentationSection): Promise<string> {
    let content = `${'#'.repeat(section.level + 1)} ${section.title}\n\n`;
    content += section.content;
    content += `\n\n---\n\n`;
    content += `*تم توليد هذا القسم بواسطة Oqool Code*\n`;

    return content;
  }

  /**
   * توليد فهرس التوثيق
   */
  private async generateIndexContent(sections: DocumentationSection[]): Promise<string> {
    let content = `# فهرس التوثيق\n\n`;
    content += `تم توليد هذا التوثيق في: ${new Date().toLocaleString('ar')}\n\n`;

    content += `## الأقسام المتاحة\n\n`;

    for (const section of sections) {
      const indent = '  '.repeat(section.level - 1);
      const status = section.metadata.generated ? '✅' : '⏳';
      const confidence = Math.round(section.metadata.confidence * 100);

      content += `${indent}${status} [${section.title}](docs/${section.id}.md) (${confidence}%)\n`;
    }

    content += `\n## الملفات المُولدة\n\n`;
    content += `- [README.md](README.md) - الملف الرئيسي\n`;
    content += `- [INDEX.md](INDEX.md) - فهرس التوثيق\n`;

    for (const section of sections) {
      content += `- [${section.title}](docs/${section.id}.md)\n`;
    }

    return content;
  }

  /**
   * حفظ فهرس التوثيق
   */
  private async saveDocumentationIndex(documentation: GeneratedDocumentation): Promise<void> {
    const indexPath = path.join(this.workingDir, this.config.outputDir, 'documentation-index.json');
    await fs.writeJson(indexPath, documentation, { spaces: 2 });
  }

  /**
   * حساب الاكتمال
   */
  private calculateCompleteness(sections: DocumentationSection[]): number {
    const requiredSections = ['introduction', 'installation', 'usage', 'structure'];
    const completedSections = sections.filter((s) => requiredSections.includes(s.id)).length;

    return Math.min(1.0, completedSections / requiredSections.length);
  }

  /**
   * توليد شجرة الملفات كنص
   */
  private generateTreeText(node: any, prefix: string, level: number): string {
    if (level > 3) return ''; // حد أقصى 3 مستويات

    let result = '';

    if (node.name) {
      const isLast = !node.children || node.children.length === 0;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      result += `${prefix}${connector}${node.name}\n`;

      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          const isLastChild = i === node.children.length - 1;
          const childPrefix = nextPrefix;

          result += this.generateTreeText(child, childPrefix, level + 1);
        }
      }
    }

    return result;
  }

  /**
   * عد الملفات
   */
  private countFiles(node: any): number {
    let count = 0;

    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'file') {
          count++;
        } else if (child.children) {
          count += this.countFiles(child);
        }
      }
    }

    return count;
  }

  /**
   * عد المجلدات
   */
  private countDirectories(node: any): number {
    let count = 0;

    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'directory') {
          count++;
          count += this.countDirectories(child);
        }
      }
    }

    return count;
  }

  /**
   * كشف اللغات الرئيسية
   */
  private async detectMainLanguages(): Promise<string[]> {
    try {
      const context = await this.fileManager.getProjectContext(100);
      const extensions = new Map<string, number>();

      for (const file of context.files) {
        const ext = path.extname(file.path);
        extensions.set(ext, (extensions.get(ext) || 0) + 1);
      }

      return Array.from(extensions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ext]) => this.getLanguageFromExtension(ext));
    } catch {
      return ['JavaScript', 'TypeScript'];
    }
  }

  /**
   * تقييم التعقيد
   */
  private async assessComplexity(): Promise<string> {
    try {
      const context = await this.fileManager.getProjectContext(20);

      if (context.totalFiles > 50) return 'معقد';
      if (context.totalFiles > 20) return 'متوسط';
      return 'بسيط';
    } catch {
      return 'متوسط';
    }
  }

  /**
   * كشف اللغة من المسار
   */
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    return this.getLanguageFromExtension(ext);
  }

  /**
   * كشف اللغة من الامتداد
   */
  private getLanguageFromExtension(ext: string): string {
    const languages: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'jsx',
      '.tsx': 'tsx',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.xml': 'xml',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.md': 'markdown',
      '.sh': 'bash',
      '.sql': 'sql',
    };

    return languages[ext] || 'text';
  }

  /**
   * تنسيق الحجم
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * كشف اللغة الرئيسية
   */
  private detectPrimaryLanguage(files: any[]): string {
    const extensions = new Map<string, number>();

    for (const file of files) {
      const ext = path.extname(file.path);
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    }

    const [topExt] = Array.from(extensions.entries()).sort((a, b) => b[1] - a[1]);
    return this.getLanguageFromExtension(topExt[0]);
  }

  /**
   * حساب تعقيد الكود
   */
  private calculateCodeComplexity(files: any[]): string {
    const totalLines = files.reduce((sum, file) => sum + file.content.split('\n').length, 0);

    if (totalLines > 10000) return 'عالي';
    if (totalLines > 5000) return 'متوسط';
    return 'منخفض';
  }

  /**
   * تقييم جودة الكود
   */
  private assessCodeQuality(files: any[]): string {
    const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.ts'));

    if (jsFiles.length === 0) return 'غير محدد';

    const totalLines = jsFiles.reduce((sum, file) => sum + file.content.split('\n').length, 0);
    const avgLines = totalLines / jsFiles.length;

    if (avgLines > 200) return 'منخفضة';
    if (avgLines > 100) return 'متوسطة';
    return 'عالية';
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * تحديث التكوين
   */
  async updateConfig(newConfig: Partial<DocumentationConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    const configPath = path.join(this.workingDir, '.oqool', 'docs-config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, this.config, { spaces: 2 });
  }
}

// مصنع لإنشاء instance
export function createDocumentationGenerator(
  apiClient: OqoolAPIClient,
  workingDir?: string
): DocumentationGenerator {
  return new DocumentationGenerator(apiClient, workingDir);
}
