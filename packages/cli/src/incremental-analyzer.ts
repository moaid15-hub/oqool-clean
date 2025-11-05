// incremental-analyzer.ts
// ============================================
// 🔄 نظام التحليل التدريجي (Incremental Analysis)
// ============================================

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { CodeAnalyzer, CodeAnalysis } from './code-analyzer.js';
import { getCacheManager } from './cache-manager.js';
import chalk from 'chalk';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface FileSnapshot {
  path: string;
  hash: string;
  size: number;
  mtime: number; // last modified time
  analysis?: CodeAnalysis;
}

export interface IncrementalResult {
  changed: string[];
  unchanged: string[];
  added: string[];
  removed: string[];
  totalAnalyzed: number;
  skippedCount: number;
  duration: number;
}

// ============================================
// 🔄 محلل تدريجي
// ============================================

export class IncrementalAnalyzer {
  private workingDir: string;
  private analyzer: CodeAnalyzer;
  private cacheManager;
  private snapshotsPath: string;
  private snapshots: Map<string, FileSnapshot>;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.analyzer = new CodeAnalyzer(workingDir);
    this.cacheManager = getCacheManager();
    this.snapshotsPath = path.join(workingDir, '.oqool', 'snapshots.json');
    this.snapshots = new Map();

    this.loadSnapshots();
  }

  /**
   * تحميل snapshots من الملف
   */
  private async loadSnapshots(): Promise<void> {
    try {
      if (await fs.pathExists(this.snapshotsPath)) {
        const data = await fs.readJSON(this.snapshotsPath);
        this.snapshots = new Map(Object.entries(data));
      }
    } catch (error) {
      // ملف snapshots فارغ أو غير صالح
      this.snapshots = new Map();
    }
  }

  /**
   * حفظ snapshots في الملف
   */
  private async saveSnapshots(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.snapshotsPath));
      const data = Object.fromEntries(this.snapshots);
      await fs.writeJSON(this.snapshotsPath, data, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('❌ فشل حفظ snapshots'));
    }
  }

  /**
   * حساب hash للملف
   */
  private async calculateHash(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.workingDir, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      return '';
    }
  }

  /**
   * إنشاء snapshot للملف
   */
  private async createSnapshot(filePath: string): Promise<FileSnapshot> {
    const fullPath = path.join(this.workingDir, filePath);
    const stats = await fs.stat(fullPath);
    const hash = await this.calculateHash(filePath);

    return {
      path: filePath,
      hash,
      size: stats.size,
      mtime: stats.mtimeMs,
    };
  }

  /**
   * التحقق من تغيير الملف
   */
  private async hasChanged(filePath: string): Promise<boolean> {
    const oldSnapshot = this.snapshots.get(filePath);

    if (!oldSnapshot) {
      return true; // ملف جديد
    }

    const newSnapshot = await this.createSnapshot(filePath);

    // مقارنة hash
    if (oldSnapshot.hash !== newSnapshot.hash) {
      return true;
    }

    // مقارنة mtime (أسرع)
    if (oldSnapshot.mtime !== newSnapshot.mtime) {
      return true;
    }

    return false;
  }

  /**
   * تحليل تدريجي للملفات
   */
  async analyzeIncremental(files: string[]): Promise<IncrementalResult> {
    const startTime = Date.now();

    const changed: string[] = [];
    const unchanged: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];

    console.log(chalk.cyan(`\n🔄 تحليل تدريجي لـ ${files.length} ملف...\n`));

    // كشف التغييرات
    for (const file of files) {
      const exists = await fs.pathExists(path.join(this.workingDir, file));

      if (!exists) {
        removed.push(file);
        continue;
      }

      const isChanged = await this.hasChanged(file);

      if (isChanged) {
        if (this.snapshots.has(file)) {
          changed.push(file);
        } else {
          added.push(file);
        }
      } else {
        unchanged.push(file);
      }
    }

    // عرض ملخص التغييرات
    this.displayChanges(changed, added, removed, unchanged);

    // تحليل الملفات المتغيرة فقط
    const toAnalyze = [...changed, ...added];
    let analyzedCount = 0;

    if (toAnalyze.length > 0) {
      console.log(chalk.cyan(`\n🧠 تحليل ${toAnalyze.length} ملف متغير...\n`));

      for (const file of toAnalyze) {
        try {
          // محاولة من الـ cache أولاً
          let analysis = await this.cacheManager.getAnalysis(file);

          if (!analysis) {
            // تحليل جديد
            analysis = await this.analyzer.analyzeFile(file);
            await this.cacheManager.cacheAnalysis(file, analysis);
          }

          // تحديث snapshot
          const snapshot = await this.createSnapshot(file);
          snapshot.analysis = analysis;
          this.snapshots.set(file, snapshot);

          analyzedCount++;
          process.stdout.write(`\r🔍 تقدم: ${analyzedCount}/${toAnalyze.length}`);
        } catch (error) {
          console.error(chalk.red(`\n❌ فشل تحليل ${file}`));
        }
      }

      process.stdout.write('\n');
    }

    // حذف snapshots للملفات المحذوفة
    for (const file of removed) {
      this.snapshots.delete(file);
    }

    // حفظ snapshots
    await this.saveSnapshots();

    const duration = Date.now() - startTime;

    console.log(chalk.green(`\n✅ اكتمل التحليل التدريجي!\n`));

    return {
      changed,
      unchanged,
      added,
      removed,
      totalAnalyzed: analyzedCount,
      skippedCount: unchanged.length,
      duration,
    };
  }

  /**
   * عرض التغييرات
   */
  private displayChanges(
    changed: string[],
    added: string[],
    removed: string[],
    unchanged: string[]
  ): void {
    console.log(chalk.cyan('📊 كشف التغييرات:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (changed.length > 0) {
      console.log(chalk.yellow(`📝 معدل: ${changed.length}`));
    }

    if (added.length > 0) {
      console.log(chalk.green(`➕ جديد: ${added.length}`));
    }

    if (removed.length > 0) {
      console.log(chalk.red(`➖ محذوف: ${removed.length}`));
    }

    if (unchanged.length > 0) {
      console.log(chalk.gray(`✓ بدون تغيير: ${unchanged.length}`));
    }

    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * عرض نتائج التحليل التدريجي
   */
  displayResult(result: IncrementalResult): void {
    console.log(chalk.cyan('\n📊 نتائج التحليل التدريجي:'));
    console.log(chalk.gray('═'.repeat(60)));

    console.log(chalk.white(`⏱️  الوقت: ${(result.duration / 1000).toFixed(2)}s`));
    console.log(chalk.green(`✅ تم تحليل: ${result.totalAnalyzed} ملف`));
    console.log(chalk.gray(`⚡ تم تخطي: ${result.skippedCount} ملف (بدون تغيير)`));

    const totalFiles = result.changed.length + result.unchanged.length + result.added.length;
    const savedPercentage =
      totalFiles > 0 ? Math.round((result.skippedCount / totalFiles) * 100) : 0;

    console.log(chalk.magenta(`🚀 تحسين الأداء: ${savedPercentage}% أسرع`));

    console.log(chalk.gray('═'.repeat(60) + '\n'));

    if (result.changed.length > 0) {
      console.log(chalk.yellow('📝 ملفات معدلة:'));
      result.changed.forEach((file) => {
        console.log(chalk.white(`  • ${file}`));
      });
      console.log('');
    }

    if (result.added.length > 0) {
      console.log(chalk.green('➕ ملفات جديدة:'));
      result.added.forEach((file) => {
        console.log(chalk.white(`  • ${file}`));
      });
      console.log('');
    }

    if (result.removed.length > 0) {
      console.log(chalk.red('➖ ملفات محذوفة:'));
      result.removed.forEach((file) => {
        console.log(chalk.white(`  • ${file}`));
      });
      console.log('');
    }
  }

  /**
   * الحصول على analysis من snapshot
   */
  async getAnalysis(filePath: string): Promise<CodeAnalysis | null> {
    const snapshot = this.snapshots.get(filePath);

    if (snapshot && snapshot.analysis) {
      return snapshot.analysis;
    }

    // محاولة من الـ cache
    return await this.cacheManager.getAnalysis(filePath);
  }

  /**
   * تحديث snapshot يدوياً
   */
  async updateSnapshot(filePath: string): Promise<void> {
    const snapshot = await this.createSnapshot(filePath);
    this.snapshots.set(filePath, snapshot);
    await this.saveSnapshots();
  }

  /**
   * مسح جميع snapshots
   */
  async clearSnapshots(): Promise<void> {
    this.snapshots.clear();
    await fs.remove(this.snapshotsPath);
    console.log(chalk.green('✅ تم مسح جميع snapshots'));
  }

  /**
   * عرض snapshots الحالية
   */
  displaySnapshots(): void {
    if (this.snapshots.size === 0) {
      console.log(chalk.yellow('⚠️  لا توجد snapshots'));
      return;
    }

    console.log(chalk.cyan(`\n📸 Snapshots (${this.snapshots.size}):`));
    console.log(chalk.gray('─'.repeat(60)));

    for (const [file, snapshot] of this.snapshots.entries()) {
      const date = new Date(snapshot.mtime).toLocaleString('ar-EG');
      console.log(chalk.white(`📄 ${file}`));
      console.log(chalk.gray(`   Hash: ${snapshot.hash.substring(0, 12)}...`));
      console.log(chalk.gray(`   Size: ${(snapshot.size / 1024).toFixed(2)} KB`));
      console.log(chalk.gray(`   Modified: ${date}`));
      console.log('');
    }

    console.log(chalk.gray('─'.repeat(60) + '\n'));
  }

  /**
   * إحصائيات الـ cache
   */
  displayCacheStats(): void {
    const stats = this.cacheManager.getStats();

    console.log(chalk.cyan('\n📊 إحصائيات Cache:'));
    console.log(chalk.gray('═'.repeat(60)));

    console.log(chalk.white(`📦 العناصر: ${stats.itemsCount}`));
    console.log(chalk.white(`💾 الحجم: ${(stats.size / 1024 / 1024).toFixed(2)} MB`));
    console.log(chalk.green(`✅ Hits: ${stats.hits}`));
    console.log(chalk.red(`❌ Misses: ${stats.misses}`));
    console.log(chalk.magenta(`📈 Hit Rate: ${stats.hitRate.toFixed(2)}%`));

    console.log(chalk.gray('═'.repeat(60) + '\n'));
  }
}

// تصدير instance
export function createIncrementalAnalyzer(workingDir?: string): IncrementalAnalyzer {
  return new IncrementalAnalyzer(workingDir);
}
