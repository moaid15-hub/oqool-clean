// file-archaeology.ts
// ============================================
// 🔍 File Archaeology System - علم آثار الملفات
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

export interface FileSnapshot {
  snapshotId: string;
  timestamp: string;
  size: number;
  action: 'created' | 'modified' | 'deleted';
  author?: string;
}

export interface FileHistory {
  filePath: string;
  created: string;
  totalModifications: number;
  currentSize: number;
  sizeGrowth: number;
  snapshots: FileSnapshot[];
  status: 'active' | 'deleted';
}

export interface ArchaeologyAnalysis {
  history: FileHistory;
  insights: string[];
  recommendations: string[];
}

export class FileArchaeology {
  private workingDir: string;
  private guardianPath: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.guardianPath = path.join(workingDir, '.oqool-guardian');
  }

  /**
   * تتبع تاريخ ملف معين عبر جميع الإصدارات
   */
  async traceFile(filePath: string): Promise<FileHistory> {
    const spinner = ora(`🔍 تتبع تاريخ الملف: ${filePath}`).start();

    try {
      // التحقق من وجود مجلد Guardian
      if (!(await fs.pathExists(this.guardianPath))) {
        spinner.fail('لم يتم تهيئة Version Guardian في هذا المشروع');
        throw new Error('Version Guardian not initialized');
      }

      const snapshotsPath = path.join(this.guardianPath, 'snapshots');
      const snapshots = await fs.readdir(snapshotsPath);

      const fileSnapshots: FileSnapshot[] = [];
      let firstSnapshot: FileSnapshot | null = null;
      let currentSize = 0;

      // فحص كل snapshot
      for (const snapshotId of snapshots) {
        const snapshotPath = path.join(snapshotsPath, snapshotId);
        const metadataPath = path.join(snapshotPath, 'metadata.json');

        if (!(await fs.pathExists(metadataPath))) continue;

        const metadata = await fs.readJson(metadataPath);
        const fileInSnapshot = path.join(snapshotPath, 'files', filePath);

        if (await fs.pathExists(fileInSnapshot)) {
          const stats = await fs.stat(fileInSnapshot);
          const snapshot: FileSnapshot = {
            snapshotId,
            timestamp: metadata.timestamp || metadata.date,
            size: stats.size,
            action: firstSnapshot ? 'modified' : 'created',
            author: metadata.author,
          };

          fileSnapshots.push(snapshot);
          currentSize = stats.size;

          if (!firstSnapshot) {
            firstSnapshot = snapshot;
          }
        } else if (firstSnapshot) {
          // الملف موجود في snapshot سابق لكن غير موجود في الحالي
          fileSnapshots.push({
            snapshotId,
            timestamp: metadata.timestamp || metadata.date,
            size: 0,
            action: 'deleted',
          });
        }
      }

      // ترتيب حسب التاريخ
      fileSnapshots.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const initialSize = firstSnapshot?.size || 0;
      const sizeGrowth = currentSize - initialSize;

      const history: FileHistory = {
        filePath,
        created: firstSnapshot?.timestamp || 'unknown',
        totalModifications: fileSnapshots.filter((s) => s.action === 'modified').length,
        currentSize,
        sizeGrowth,
        snapshots: fileSnapshots,
        status:
          fileSnapshots[fileSnapshots.length - 1]?.action === 'deleted' ? 'deleted' : 'active',
      };

      spinner.succeed(`تم تتبع ${fileSnapshots.length} إصدار للملف`);
      return history;
    } catch (error) {
      spinner.fail('فشل تتبع الملف');
      throw error;
    }
  }

  /**
   * تحليل متقدم لتاريخ الملف
   */
  async analyzeFile(filePath: string): Promise<ArchaeologyAnalysis> {
    const history = await this.traceFile(filePath);
    const insights: string[] = [];
    const recommendations: string[] = [];

    // التحليلات الذكية
    if (history.totalModifications > 10) {
      insights.push(`الملف يتغير بشكل متكرر (${history.totalModifications} تعديل)`);
      recommendations.push('قد تحتاج لمراجعة بنية هذا الملف لتقليل التعديلات المتكررة');
    }

    if (history.sizeGrowth > 100000) {
      // أكبر من 100KB
      insights.push(`الملف نما بشكل كبير (+${this.formatSize(history.sizeGrowth)})`);
      recommendations.push('راجع الكود الزائد أو البيانات المكررة');
    }

    if (history.sizeGrowth < 0) {
      insights.push(`الملف تقلص بمقدار ${this.formatSize(Math.abs(history.sizeGrowth))}`);
      insights.push('تم حذف كود أو إعادة هيكلة');
    }

    if (history.status === 'deleted') {
      insights.push('⚠️ الملف محذوف في الإصدار الحالي');
      recommendations.push('يمكنك استرجاعه من snapshot سابق إذا لزم الأمر');
    }

    const modificationRate = history.totalModifications / history.snapshots.length;
    if (modificationRate > 0.7) {
      insights.push('الملف يتغير في معظم الإصدارات');
      recommendations.push('هذا ملف نشط جداً - تأكد من جودة الكود');
    }

    return {
      history,
      insights,
      recommendations,
    };
  }

  /**
   * عرض تاريخ الملف بشكل جميل
   */
  async displayFileHistory(filePath: string): Promise<void> {
    console.log(chalk.cyan('\n🔍 علم آثار الملفات - File Archaeology\n'));
    console.log(chalk.white('═'.repeat(60)));

    const analysis = await this.analyzeFile(filePath);
    const { history, insights, recommendations } = analysis;

    // معلومات أساسية
    console.log(chalk.yellow('\n📄 معلومات الملف:\n'));
    console.log(chalk.white(`   المسار:           ${history.filePath}`));
    console.log(chalk.white(`   تاريخ الإنشاء:    ${this.formatDate(history.created)}`));
    console.log(chalk.white(`   عدد التعديلات:   ${history.totalModifications} مرة`));
    console.log(chalk.white(`   الحجم الحالي:     ${this.formatSize(history.currentSize)}`));

    const growthColor = history.sizeGrowth >= 0 ? chalk.green : chalk.red;
    const growthSign = history.sizeGrowth >= 0 ? '+' : '';
    console.log(
      chalk.white(
        `   نمو الحجم:        ${growthColor(growthSign + this.formatSize(history.sizeGrowth))}`
      )
    );

    const statusColor = history.status === 'active' ? chalk.green : chalk.red;
    console.log(
      chalk.white(
        `   الحالة:           ${statusColor(history.status === 'active' ? 'نشط' : 'محذوف')}`
      )
    );

    // التاريخ التفصيلي
    console.log(chalk.yellow('\n📅 التاريخ التفصيلي:\n'));

    const table = new Table({
      head: [
        chalk.cyan('التاريخ'),
        chalk.cyan('الإجراء'),
        chalk.cyan('الحجم'),
        chalk.cyan('Snapshot ID'),
      ],
      colWidths: [22, 12, 12, 20],
    });

    for (const snapshot of history.snapshots) {
      const actionColor =
        snapshot.action === 'created'
          ? chalk.green
          : snapshot.action === 'modified'
            ? chalk.yellow
            : chalk.red;

      const actionText =
        snapshot.action === 'created' ? 'إنشاء' : snapshot.action === 'modified' ? 'تعديل' : 'حذف';

      table.push([
        this.formatDate(snapshot.timestamp),
        actionColor(actionText),
        this.formatSize(snapshot.size),
        snapshot.snapshotId.substring(0, 16) + '...',
      ]);
    }

    console.log(table.toString());

    // رؤى ذكية
    if (insights.length > 0) {
      console.log(chalk.yellow('\n💡 رؤى ذكية:\n'));
      insights.forEach((insight) => {
        console.log(chalk.white(`   • ${insight}`));
      });
    }

    // توصيات
    if (recommendations.length > 0) {
      console.log(chalk.yellow('\n📌 توصيات:\n'));
      recommendations.forEach((rec) => {
        console.log(chalk.white(`   → ${rec}`));
      });
    }

    console.log(chalk.white('\n' + '═'.repeat(60) + '\n'));
  }

  /**
   * مقارنة ملف بين snapshot معينة والحالية
   */
  async compareWithSnapshot(filePath: string, snapshotId: string): Promise<void> {
    const spinner = ora('مقارنة الإصدارات...').start();

    try {
      const snapshotPath = path.join(this.guardianPath, 'snapshots', snapshotId, 'files', filePath);
      const currentPath = path.join(this.workingDir, filePath);

      if (!(await fs.pathExists(snapshotPath))) {
        spinner.fail('الملف غير موجود في الـ snapshot المحدد');
        return;
      }

      if (!(await fs.pathExists(currentPath))) {
        spinner.warn('الملف غير موجود في الإصدار الحالي (تم حذفه)');
        return;
      }

      const [oldContent, newContent] = await Promise.all([
        fs.readFile(snapshotPath, 'utf-8'),
        fs.readFile(currentPath, 'utf-8'),
      ]);

      const oldLines = oldContent.split('\n').length;
      const newLines = newContent.split('\n').length;
      const linesDiff = newLines - oldLines;

      spinner.succeed('تمت المقارنة');

      console.log(chalk.cyan('\n📊 نتيجة المقارنة:\n'));
      console.log(chalk.white(`   الإصدار القديم:  ${oldLines} سطر`));
      console.log(chalk.white(`   الإصدار الحالي:   ${newLines} سطر`));

      const diffColor = linesDiff >= 0 ? chalk.green : chalk.red;
      console.log(
        chalk.white(
          `   الفرق:            ${diffColor((linesDiff >= 0 ? '+' : '') + linesDiff)} سطر\n`
        )
      );
    } catch (error) {
      spinner.fail('فشلت المقارنة');
      throw error;
    }
  }

  /**
   * البحث عن الملفات الأكثر تغييراً في المشروع
   */
  async findMostChangedFiles(limit: number = 10): Promise<void> {
    const spinner = ora('تحليل الملفات الأكثر تغييراً...').start();

    try {
      const snapshotsPath = path.join(this.guardianPath, 'snapshots');
      const snapshots = await fs.readdir(snapshotsPath);

      const fileChanges = new Map<string, number>();

      // حساب عدد التغييرات لكل ملف
      for (const snapshotId of snapshots) {
        const filesPath = path.join(snapshotsPath, snapshotId, 'files');

        if (!(await fs.pathExists(filesPath))) continue;

        const files = await this.getAllFiles(filesPath);

        for (const file of files) {
          const relativePath = path.relative(filesPath, file);
          fileChanges.set(relativePath, (fileChanges.get(relativePath) || 0) + 1);
        }
      }

      // ترتيب وعرض النتائج
      const sorted = Array.from(fileChanges.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      spinner.succeed(`تم تحليل ${fileChanges.size} ملف`);

      console.log(chalk.cyan('\n🔥 الملفات الأكثر تغييراً:\n'));

      const table = new Table({
        head: [chalk.cyan('#'), chalk.cyan('الملف'), chalk.cyan('عدد التغييرات')],
        colWidths: [5, 50, 18],
      });

      sorted.forEach(([file, count], index) => {
        table.push([
          chalk.yellow((index + 1).toString()),
          chalk.white(file),
          chalk.green(count.toString()),
        ]);
      });

      console.log(table.toString());
      console.log();
    } catch (error) {
      spinner.fail('فشل التحليل');
      throw error;
    }
  }

  /**
   * الحصول على جميع الملفات في مجلد
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentPath: string) {
      const items = await fs.readdir(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await walk(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    }

    await walk(dir);
    return files;
  }

  /**
   * تنسيق التاريخ
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * تنسيق الحجم
   */
  private formatSize(bytes: number): string {
    const absBytes = Math.abs(bytes);
    if (absBytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(absBytes) / Math.log(1024));
    const size = (absBytes / Math.pow(1024, i)).toFixed(2);

    return (bytes < 0 ? '-' : '') + size + ' ' + units[i];
  }
}

export function createFileArchaeology(workingDir?: string): FileArchaeology {
  return new FileArchaeology(workingDir);
}
