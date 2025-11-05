// context-manager.ts
// ============================================
// 🧠 Context Manager - إدارة ذكية للسياق
// ============================================

import fs from 'fs-extra';
import { join, relative, extname } from 'path';
import { glob } from 'glob';

export interface FileContext {
  path: string;
  content?: string;
  lastRead: number;
  size: number;
  symbols?: string[]; // functions, classes, etc
  dependencies?: string[];
}

export interface ProjectContext {
  root: string;
  name: string;
  type: 'node' | 'python' | 'web' | 'unknown';
  framework?: string;
  dependencies: Record<string, string>;
  structure: string[]; // important directories
}

export class ContextManager {
  private workingDirectory: string;
  private fileCache: Map<string, FileContext> = new Map();
  private projectContext?: ProjectContext;
  private openFiles: Set<string> = new Set();
  private recentChanges: string[] = [];

  // Settings
  private readonly MAX_CACHE_SIZE = 50; // max files in cache
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  // ============================================
  // 📊 تحليل المشروع
  // ============================================
  async analyzeProject(): Promise<ProjectContext> {
    if (this.projectContext) {
      return this.projectContext;
    }

    const context: ProjectContext = {
      root: this.workingDirectory,
      name: '',
      type: 'unknown',
      dependencies: {},
      structure: [],
    };

    // تحديد نوع المشروع
    if (await fs.pathExists(join(this.workingDirectory, 'package.json'))) {
      context.type = 'node';
      const pkg = await fs.readJSON(join(this.workingDirectory, 'package.json'));
      context.name = pkg.name || 'unnamed';
      context.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

      // تحديد الفريمووورك
      if (pkg.dependencies?.['next']) context.framework = 'Next.js';
      else if (pkg.dependencies?.['react']) context.framework = 'React';
      else if (pkg.dependencies?.['vue']) context.framework = 'Vue';
      else if (pkg.dependencies?.['express']) context.framework = 'Express';
    } else if (await fs.pathExists(join(this.workingDirectory, 'requirements.txt'))) {
      context.type = 'python';
      context.name = this.workingDirectory.split('/').pop() || 'unnamed';
    } else if (await fs.pathExists(join(this.workingDirectory, 'index.html'))) {
      context.type = 'web';
    }

    // بنية المشروع
    context.structure = await this.discoverStructure();

    this.projectContext = context;
    return context;
  }

  // ============================================
  // 🗂️ اكتشاف بنية المشروع
  // ============================================
  private async discoverStructure(): Promise<string[]> {
    const dirs = [
      'src',
      'lib',
      'app',
      'pages',
      'components',
      'utils',
      'helpers',
      'services',
      'api',
      'tests',
      '__tests__',
      'test',
    ];

    const existing: string[] = [];
    for (const dir of dirs) {
      const fullPath = join(this.workingDirectory, dir);
      if (await fs.pathExists(fullPath)) {
        existing.push(dir);
      }
    }

    return existing;
  }

  // ============================================
  // 📁 قراءة ملف مع Cache
  // ============================================
  async getFile(filePath: string): Promise<string> {
    const cached = this.fileCache.get(filePath);

    // استخدام الـ cache إذا كان حديث
    if (cached && Date.now() - cached.lastRead < this.CACHE_TTL) {
      return cached.content || '';
    }

    // قراءة من الملف
    try {
      const fullPath = this.resolvePath(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const stats = await fs.stat(fullPath);

      this.updateCache(filePath, {
        path: filePath,
        content,
        lastRead: Date.now(),
        size: stats.size,
      });

      return content;
    } catch (error) {
      throw new Error(`فشل في قراءة الملف: ${filePath}`);
    }
  }

  // ============================================
  // 💾 تحديث الـ Cache
  // ============================================
  private updateCache(filePath: string, context: FileContext): void {
    // إذا وصل الـ cache للحد الأقصى، احذف الأقدم
    if (this.fileCache.size >= this.MAX_CACHE_SIZE) {
      const oldest = Array.from(this.fileCache.entries()).sort(
        (a, b) => a[1].lastRead - b[1].lastRead
      )[0];

      this.fileCache.delete(oldest[0]);
    }

    this.fileCache.set(filePath, context);
  }

  // ============================================
  // 📂 فتح ملف (يضيفه للـ context)
  // ============================================
  async openFile(filePath: string): Promise<void> {
    this.openFiles.add(filePath);
    await this.getFile(filePath); // يقرأه ويحفظه في cache
  }

  // ============================================
  // ❌ إغلاق ملف
  // ============================================
  closeFile(filePath: string): void {
    this.openFiles.delete(filePath);
  }

  // ============================================
  // 📝 تسجيل تغيير في ملف
  // ============================================
  recordChange(filePath: string): void {
    // احذف من الـ cache لأنه تغير
    this.fileCache.delete(filePath);

    // أضفه لقائمة التغييرات الحديثة
    this.recentChanges.unshift(filePath);

    // احتفظ فقط بآخر 20 تغيير
    if (this.recentChanges.length > 20) {
      this.recentChanges.pop();
    }
  }

  // ============================================
  // 🔍 البحث الذكي في الملفات
  // ============================================
  async searchFiles(
    pattern: string,
    options?: {
      includeContent?: boolean;
      fileTypes?: string[];
    }
  ): Promise<string[]> {
    const searchPattern = pattern.includes('*') ? pattern : `**/*${pattern}*`;

    const files = await glob(searchPattern, {
      cwd: this.workingDirectory,
      ignore: ['node_modules/**', 'dist/**', '.git/**'],
    });

    return files;
  }

  // ============================================
  // 📊 معلومات الـ Context
  // ============================================
  getContextInfo(): {
    project: ProjectContext | undefined;
    openFiles: string[];
    cachedFiles: number;
    recentChanges: string[];
  } {
    return {
      project: this.projectContext,
      openFiles: Array.from(this.openFiles),
      cachedFiles: this.fileCache.size,
      recentChanges: this.recentChanges.slice(0, 10),
    };
  }

  // ============================================
  // 🧹 تنظيف الـ Cache
  // ============================================
  clearCache(): void {
    this.fileCache.clear();
  }

  // ============================================
  // 🎯 توليد ملخص للمشروع
  // ============================================
  async generateProjectSummary(): Promise<string> {
    const context = await this.analyzeProject();

    let summary = `# 📊 ملخص المشروع\n\n`;
    summary += `**اسم المشروع:** ${context.name}\n`;
    summary += `**النوع:** ${context.type}\n`;

    if (context.framework) {
      summary += `**الفريمووورك:** ${context.framework}\n`;
    }

    summary += `\n## 📁 البنية:\n`;
    for (const dir of context.structure) {
      summary += `- ${dir}/\n`;
    }

    if (Object.keys(context.dependencies).length > 0) {
      summary += `\n## 📦 Dependencies الرئيسية:\n`;
      const topDeps = Object.entries(context.dependencies).slice(0, 10);
      for (const [name, version] of topDeps) {
        summary += `- ${name}: ${version}\n`;
      }
    }

    return summary;
  }

  // ============================================
  // 🛠️ Helper - حل المسار
  // ============================================
  private resolvePath(filePath: string): string {
    if (filePath.startsWith('/')) {
      return filePath;
    }
    return join(this.workingDirectory, filePath);
  }

  // ============================================
  // 🎯 الحصول على الملفات ذات الصلة
  // ============================================
  async getRelatedFiles(filePath: string): Promise<string[]> {
    const ext = extname(filePath);
    const dir = relative(this.workingDirectory, filePath).split('/')[0];

    // ابحث عن ملفات من نفس النوع في نفس المجلد
    const pattern = join(dir, `*${ext}`);
    return await this.searchFiles(pattern);
  }
}
