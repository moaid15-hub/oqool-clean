// code-library.ts
// ============================================
// 📚 Code Library - مكتبة الأكواد
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface CodeSnippet {
  name: string;
  code: string;
  tags: string[];
  language: string;
  description?: string;
  author?: string;
  createdAt: string;
  usageCount: number;
}

export interface CodeLibraryConfig {
  libraryPath: string;
  enableSharing?: boolean;
  enableStats?: boolean;
}

export class CodeLibrary {
  private config: CodeLibraryConfig;
  private snippetsPath: string;

  constructor(config: CodeLibraryConfig) {
    this.config = {
      enableSharing: true,
      enableStats: true,
      ...config,
    };

    this.snippetsPath = path.join(this.config.libraryPath, '.oqool', 'snippets');
    this.ensureLibraryExists();
  }

  // ============================================
  // 📁 تهيئة المكتبة
  // ============================================
  private async ensureLibraryExists(): Promise<void> {
    try {
      await fs.ensureDir(this.snippetsPath);
    } catch (error) {
      console.error(chalk.red('❌ فشل في إنشاء مجلد المكتبة'));
    }
  }

  // ============================================
  // 💾 حفظ Snippet
  // ============================================
  async saveSnippet(
    name: string,
    code: string,
    tags: string[],
    description?: string
  ): Promise<void> {
    try {
      // اكتشاف اللغة من الكود
      const language = this.detectLanguage(code);

      const snippet: CodeSnippet = {
        name,
        code,
        tags,
        language,
        description,
        author: 'Oqool User',
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      const snippetPath = path.join(this.snippetsPath, `${name}.json`);
      await fs.writeJson(snippetPath, snippet, { spaces: 2 });

      console.log(chalk.green(`✅ تم حفظ الـ snippet: ${name}`));
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل حفظ الـ snippet: ${error.message}`));
    }
  }

  // ============================================
  // 🔍 البحث في المكتبة
  // ============================================
  async searchSnippets(query: string): Promise<CodeSnippet[]> {
    try {
      const files = await fs.readdir(this.snippetsPath);
      const snippets: CodeSnippet[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const snippetPath = path.join(this.snippetsPath, file);
        const snippet: CodeSnippet = await fs.readJson(snippetPath);

        // البحث في الاسم، الوصف، أو التاجات
        const matchesName = snippet.name.toLowerCase().includes(query.toLowerCase());
        const matchesDesc = snippet.description?.toLowerCase().includes(query.toLowerCase());
        const matchesTags = snippet.tags.some((tag) =>
          tag.toLowerCase().includes(query.toLowerCase())
        );

        if (matchesName || matchesDesc || matchesTags) {
          snippets.push(snippet);
        }
      }

      if (snippets.length > 0) {
        console.log(chalk.cyan(`\n🔍 وجدت ${snippets.length} snippets:\n`));
        snippets.forEach((s, i) => {
          console.log(chalk.blue(`${i + 1}. ${s.name}`) + chalk.gray(` [${s.language}]`));
          if (s.description) {
            console.log(chalk.gray(`   ${s.description}`));
          }
          console.log(chalk.yellow(`   Tags: ${s.tags.join(', ')}`));
        });
      } else {
        console.log(chalk.yellow('⚠️ لم يتم العثور على snippets'));
      }

      return snippets;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل البحث: ${error.message}`));
      return [];
    }
  }

  // ============================================
  // 📤 مشاركة Snippet
  // ============================================
  async shareSnippet(name: string): Promise<string | null> {
    try {
      if (!this.config.enableSharing) {
        console.log(chalk.yellow('⚠️ المشاركة معطلة'));
        return null;
      }

      const snippetPath = path.join(this.snippetsPath, `${name}.json`);

      if (!(await fs.pathExists(snippetPath))) {
        console.log(chalk.red(`❌ الـ snippet "${name}" غير موجود`));
        return null;
      }

      const snippet: CodeSnippet = await fs.readJson(snippetPath);

      // إنشاء ملف للمشاركة
      const sharedPath = path.join(this.config.libraryPath, '.oqool', 'shared');
      await fs.ensureDir(sharedPath);

      const sharedFile = path.join(sharedPath, `${name}.shared.json`);
      await fs.writeJson(sharedFile, snippet, { spaces: 2 });

      console.log(chalk.green(`✅ تم تجهيز الـ snippet للمشاركة`));
      console.log(chalk.cyan(`📂 المسار: ${sharedFile}`));

      return sharedFile;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل المشاركة: ${error.message}`));
      return null;
    }
  }

  // ============================================
  // 📖 قراءة Snippet
  // ============================================
  async getSnippet(name: string): Promise<CodeSnippet | null> {
    try {
      const snippetPath = path.join(this.snippetsPath, `${name}.json`);

      if (!(await fs.pathExists(snippetPath))) {
        console.log(chalk.yellow(`⚠️ الـ snippet "${name}" غير موجود`));
        return null;
      }

      const snippet: CodeSnippet = await fs.readJson(snippetPath);

      // زيادة عدد الاستخدام
      if (this.config.enableStats) {
        snippet.usageCount++;
        await fs.writeJson(snippetPath, snippet, { spaces: 2 });
      }

      return snippet;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل قراءة الـ snippet: ${error.message}`));
      return null;
    }
  }

  // ============================================
  // 📊 عرض جميع Snippets
  // ============================================
  async listAllSnippets(): Promise<CodeSnippet[]> {
    try {
      const files = await fs.readdir(this.snippetsPath);
      const snippets: CodeSnippet[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const snippetPath = path.join(this.snippetsPath, file);
        const snippet: CodeSnippet = await fs.readJson(snippetPath);
        snippets.push(snippet);
      }

      // ترتيب حسب الاستخدام
      snippets.sort((a, b) => b.usageCount - a.usageCount);

      console.log(chalk.cyan(`\n📚 المكتبة تحتوي على ${snippets.length} snippets:\n`));

      snippets.forEach((s, i) => {
        console.log(
          chalk.blue(`${i + 1}. ${s.name}`) +
            chalk.gray(` [${s.language}]`) +
            chalk.yellow(` 📊 ${s.usageCount} استخدام`)
        );
        if (s.description) {
          console.log(chalk.gray(`   ${s.description}`));
        }
      });

      return snippets;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل عرض المكتبة: ${error.message}`));
      return [];
    }
  }

  // ============================================
  // 🗑️ حذف Snippet
  // ============================================
  async deleteSnippet(name: string): Promise<boolean> {
    try {
      const snippetPath = path.join(this.snippetsPath, `${name}.json`);

      if (!(await fs.pathExists(snippetPath))) {
        console.log(chalk.yellow(`⚠️ الـ snippet "${name}" غير موجود`));
        return false;
      }

      await fs.remove(snippetPath);
      console.log(chalk.green(`✅ تم حذف الـ snippet: ${name}`));
      return true;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل الحذف: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 🔤 اكتشاف اللغة
  // ============================================
  private detectLanguage(code: string): string {
    if (code.includes('function') || code.includes('const') || code.includes('let')) {
      return 'JavaScript';
    } else if (code.includes('def ') || code.includes('import ')) {
      return 'Python';
    } else if (code.includes('public class') || code.includes('private')) {
      return 'Java';
    } else if (code.includes('fn ') || code.includes('let mut')) {
      return 'Rust';
    } else if (code.includes('func ') || code.includes('package ')) {
      return 'Go';
    } else if (code.includes('<?php')) {
      return 'PHP';
    } else {
      return 'Unknown';
    }
  }

  // ============================================
  // 📈 إحصائيات المكتبة
  // ============================================
  async getStats(): Promise<{
    totalSnippets: number;
    mostUsed: CodeSnippet[];
    byLanguage: Record<string, number>;
    totalUsage: number;
  }> {
    try {
      const snippets = await this.listAllSnippets();

      const byLanguage: Record<string, number> = {};
      let totalUsage = 0;

      for (const snippet of snippets) {
        // حساب حسب اللغة
        byLanguage[snippet.language] = (byLanguage[snippet.language] || 0) + 1;
        totalUsage += snippet.usageCount;
      }

      // أكثر 5 استخداماً
      const mostUsed = snippets.slice(0, 5);

      return {
        totalSnippets: snippets.length,
        mostUsed,
        byLanguage,
        totalUsage,
      };
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل جلب الإحصائيات: ${error.message}`));
      return {
        totalSnippets: 0,
        mostUsed: [],
        byLanguage: {},
        totalUsage: 0,
      };
    }
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createCodeLibrary(config: CodeLibraryConfig): CodeLibrary {
  return new CodeLibrary(config);
}
