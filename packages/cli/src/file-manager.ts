// file-manager.ts
// ============================================
// 📁 مدير الملفات - قراءة وكتابة وتحليل
// ============================================

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import chalk from 'chalk';

export interface FileInfo {
  path: string;
  content: string;
  size: number;
  extension: string;
}

// ProjectContext is now exported from context-manager.ts
interface ProjectContext {
  files: FileInfo[];
  structure: string;
  totalFiles: number;
  totalSize: number;
}

export interface PatchOperation {
  line: number; // رقم السطر للبدء
  remove?: number; // عدد الأسطر للحذف (اختياري)
  add?: string; // النص الجديد للإضافة (اختياري)
  replace?: string; // النص للاستبدال (اختياري)
}

export interface FilePatch {
  path: string;
  patches: PatchOperation[];
}

// الملفات والمجلدات المستبعدة افتراضياً
const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '*.log',
  '.env*',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

// الامتدادات المدعومة للقراءة
const SUPPORTED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.html',
  '.css',
  '.scss',
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.txt',
];

export class FileManager {
  private workingDir: string;
  private ig: ReturnType<typeof ignore>;
  private changedFiles: Set<string>;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.ig = ignore();
    this.changedFiles = new Set();
    this.loadIgnorePatterns();
  }

  // تحميل قواعد .gitignore
  private async loadIgnorePatterns(): Promise<void> {
    // إضافة القواعد الافتراضية
    this.ig.add(DEFAULT_IGNORE_PATTERNS);

    // قراءة .gitignore إن وجد
    const gitignorePath = path.join(this.workingDir, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      this.ig.add(content);
    }

    // قراءة .oqoolignore إن وجد (ملف خاص بـ Oqool)
    const oqoolignorePath = path.join(this.workingDir, '.oqoolignore');
    if (await fs.pathExists(oqoolignorePath)) {
      const content = await fs.readFile(oqoolignorePath, 'utf-8');
      this.ig.add(content);
    }
  }

  // الحصول على سياق المشروع
  async getProjectContext(maxFiles: number = 10): Promise<ProjectContext> {
    const files = await this.scanFiles(maxFiles);
    const structure = await this.getDirectoryStructure();

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    return {
      files,
      structure,
      totalFiles: files.length,
      totalSize,
    };
  }

  // فحص الملفات في المجلد
  async scanFiles(maxFiles: number = 10): Promise<FileInfo[]> {
    try {
      const pattern = `**/*{${SUPPORTED_EXTENSIONS.join(',')}}`;
      const filePaths = await glob(pattern, {
        cwd: this.workingDir,
        absolute: false,
        ignore: DEFAULT_IGNORE_PATTERNS,
      });

      // تصفية بواسطة ignore
      const filteredPaths = filePaths.filter((p) => !this.ig.ignores(p)).slice(0, maxFiles);

      const files: FileInfo[] = [];

      for (const relativePath of filteredPaths) {
        const fullPath = path.join(this.workingDir, relativePath);
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const stats = await fs.stat(fullPath);

          files.push({
            path: relativePath,
            content,
            size: stats.size,
            extension: path.extname(relativePath),
          });
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  تعذرت قراءة: ${relativePath}`));
        }
      }

      return files;
    } catch (error) {
      console.error(chalk.red('❌ خطأ في فحص الملفات:'), error);
      return [];
    }
  }

  // قراءة ملف واحد
  async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.join(this.workingDir, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error(chalk.red(`❌ فشل قراءة ${filePath}:`), error);
      return null;
    }
  }

  // كتابة ملف
  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.workingDir, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      console.log(chalk.green(`✅ تم كتابة: ${filePath}`));

      // تتبع الملف المتغير
      this.changedFiles.add(filePath);

      return true;
    } catch (error) {
      console.error(chalk.red(`❌ فشلت كتابة ${filePath}:`), error);
      return false;
    }
  }

  // حذف ملف
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.workingDir, filePath);
      await fs.remove(fullPath);
      console.log(chalk.yellow(`🗑️  تم حذف: ${filePath}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ فشل حذف ${filePath}:`), error);
      return false;
    }
  }

  // الحصول على بنية المجلد
  async getDirectoryStructure(maxDepth: number = 3): Promise<string> {
    try {
      let structure = `📂 ${path.basename(this.workingDir)}/\n`;
      structure += await this.buildTree(this.workingDir, '', maxDepth, 0);
      return structure;
    } catch (error) {
      console.error(chalk.red('❌ خطأ في بناء البنية:'), error);
      return 'فشل بناء بنية المشروع';
    }
  }

  // بناء شجرة المجلدات (recursive)
  private async buildTree(
    dir: string,
    prefix: string,
    maxDepth: number,
    currentDepth: number
  ): Promise<string> {
    if (currentDepth >= maxDepth) return '';

    let result = '';
    const items = await fs.readdir(dir);
    const filteredItems = items
      .filter((item) => !this.ig.ignores(item))
      .filter((item) => !item.startsWith('.'));

    for (let i = 0; i < filteredItems.length; i++) {
      const item = filteredItems[i];
      const isLast = i === filteredItems.length - 1;
      const itemPath = path.join(dir, item);
      const stats = await fs.stat(itemPath);

      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      if (stats.isDirectory()) {
        result += `${prefix}${connector}📁 ${item}/\n`;
        result += await this.buildTree(itemPath, nextPrefix, maxDepth, currentDepth + 1);
      } else {
        const icon = this.getFileIcon(item);
        result += `${prefix}${connector}${icon} ${item}\n`;
      }
    }

    return result;
  }

  // الحصول على أيقونة الملف حسب الامتداد
  private getFileIcon(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const icons: Record<string, string> = {
      '.js': '📜',
      '.jsx': '⚛️',
      '.ts': '📘',
      '.tsx': '⚛️',
      '.py': '🐍',
      '.java': '☕',
      '.go': '🐹',
      '.rs': '🦀',
      '.html': '🌐',
      '.css': '🎨',
      '.json': '📋',
      '.md': '📝',
      '.txt': '📄',
    };
    return icons[ext] || '📄';
  }

  // استخراج الملفات من رد AI
  extractFilesFromResponse(response: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // البحث عن أنماط مثل: ### path/to/file.js
    const filePattern = /###\s+([^\n]+)\n```[\w]*\n([\s\S]*?)```/g;
    let match;

    while ((match = filePattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      files.push({ path: filePath, content });
    }

    return files;
  }

  // ============================================
  // 🔧 نظام Patch المتقدم
  // ============================================

  /**
   * تطبيق patch على ملف
   * @param filePath مسار الملف
   * @param patch عملية الـ patch
   * @returns نجاح العملية
   */
  async applyPatch(filePath: string, patch: PatchOperation): Promise<boolean> {
    try {
      const fullPath = path.join(this.workingDir, filePath);

      // قراءة الملف
      if (!(await fs.pathExists(fullPath))) {
        console.error(chalk.red(`❌ الملف غير موجود: ${filePath}`));
        return false;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // التحقق من رقم السطر
      if (patch.line < 1 || patch.line > lines.length + 1) {
        console.error(
          chalk.red(`❌ رقم سطر غير صحيح: ${patch.line} (الملف يحتوي على ${lines.length} سطر)`)
        );
        return false;
      }

      const lineIndex = patch.line - 1; // تحويل لـ zero-based index

      // تطبيق العملية
      if (patch.replace !== undefined) {
        // استبدال سطر
        lines[lineIndex] = patch.replace;
        console.log(chalk.green(`✏️  استبدال السطر ${patch.line} في ${filePath}`));
      } else {
        // حذف أسطر
        if (patch.remove && patch.remove > 0) {
          lines.splice(lineIndex, patch.remove);
          console.log(
            chalk.yellow(`🗑️  حذف ${patch.remove} سطر من ${filePath} بدءاً من السطر ${patch.line}`)
          );
        }

        // إضافة أسطر جديدة
        if (patch.add) {
          const newLines = patch.add.split('\n');
          lines.splice(lineIndex, 0, ...newLines);
          console.log(
            chalk.green(`➕ إضافة ${newLines.length} سطر إلى ${filePath} في السطر ${patch.line}`)
          );
        }
      }

      // كتابة الملف المحدث
      const updatedContent = lines.join('\n');
      await fs.writeFile(fullPath, updatedContent, 'utf-8');

      // تتبع الملف المتغير
      this.changedFiles.add(filePath);

      console.log(chalk.green(`✅ تم تطبيق الـ patch على ${filePath}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ فشل تطبيق الـ patch على ${filePath}:`), error);
      return false;
    }
  }

  /**
   * تطبيق عدة patches على ملف واحد
   * @param filePath مسار الملف
   * @param patches قائمة العمليات
   * @returns نجاح العملية
   */
  async applyPatches(filePath: string, patches: PatchOperation[]): Promise<boolean> {
    try {
      // ترتيب الـ patches من الأعلى للأسفل (من أكبر رقم سطر لأصغر)
      // هذا يمنع تغيير أرقام الأسطر أثناء التطبيق
      const sortedPatches = [...patches].sort((a, b) => b.line - a.line);

      for (const patch of sortedPatches) {
        const success = await this.applyPatch(filePath, patch);
        if (!success) {
          console.error(chalk.red(`❌ فشل تطبيق أحد الـ patches على ${filePath}`));
          return false;
        }
      }

      console.log(chalk.green(`✅ تم تطبيق ${patches.length} patch على ${filePath}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ فشل تطبيق الـ patches على ${filePath}:`), error);
      return false;
    }
  }

  /**
   * استخراج patches من رد AI
   * يبحث عن نمط مثل:
   * PATCH: src/api.js
   * LINE: 45
   * REMOVE: 2
   * ADD:
   * ```
   * const result = await db.query();
   * ```
   */
  extractPatchesFromResponse(response: string): FilePatch[] {
    const filePatches: FilePatch[] = [];

    // نمط للبحث عن PATCH blocks
    const patchPattern = /PATCH:\s*([^\n]+)\s*\n((?:LINE:[\s\S]*?(?=PATCH:|$))+)/gi;
    let fileMatch;

    while ((fileMatch = patchPattern.exec(response)) !== null) {
      const filePath = fileMatch[1].trim();
      const patchesBlock = fileMatch[2];

      const patches: PatchOperation[] = [];

      // استخراج كل عملية patch
      const operationPattern =
        /LINE:\s*(\d+)(?:\s*\nREMOVE:\s*(\d+))?(?:\s*\nREPLACE:\s*\n```[\w]*\n([\s\S]*?)```)?(?:\s*\nADD:\s*\n```[\w]*\n([\s\S]*?)```)?/gi;
      let opMatch;

      while ((opMatch = operationPattern.exec(patchesBlock)) !== null) {
        const line = parseInt(opMatch[1]);
        const remove = opMatch[2] ? parseInt(opMatch[2]) : undefined;
        const replace = opMatch[3]?.trim();
        const add = opMatch[4]?.trim();

        patches.push({
          line,
          remove,
          replace,
          add,
        });
      }

      if (patches.length > 0) {
        filePatches.push({ path: filePath, patches });
      }
    }

    return filePatches;
  }

  /**
   * عرض معاينة للـ patch قبل التطبيق
   */
  async previewPatch(filePath: string, patch: PatchOperation): Promise<void> {
    try {
      const fullPath = path.join(this.workingDir, filePath);

      if (!(await fs.pathExists(fullPath))) {
        console.log(chalk.red(`❌ الملف غير موجود: ${filePath}`));
        return;
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      console.log(chalk.blue(`\n📋 معاينة الـ patch على ${filePath}:`));
      console.log(chalk.gray('─'.repeat(60)));

      const startLine = Math.max(0, patch.line - 3);
      const endLine = Math.min(lines.length, patch.line + 5);

      for (let i = startLine; i < endLine; i++) {
        const lineNum = i + 1;

        if (lineNum === patch.line && patch.replace) {
          // سطر سيتم استبداله
          console.log(chalk.red(`- ${lineNum}: ${lines[i]}`));
          console.log(chalk.green(`+ ${lineNum}: ${patch.replace}`));
        } else if (lineNum >= patch.line && patch.remove && lineNum < patch.line + patch.remove) {
          // أسطر ستحذف
          console.log(chalk.red(`- ${lineNum}: ${lines[i]}`));
        } else if (lineNum === patch.line && patch.add) {
          // مكان الإضافة
          console.log(chalk.gray(`  ${lineNum}: ${lines[i]}`));
          const addLines = patch.add.split('\n');
          addLines.forEach((addLine, idx) => {
            console.log(chalk.green(`+ ${lineNum + idx}: ${addLine}`));
          });
        } else {
          // أسطر عادية
          console.log(chalk.gray(`  ${lineNum}: ${lines[i]}`));
        }
      }

      console.log(chalk.gray('─'.repeat(60) + '\n'));
    } catch (error) {
      console.error(chalk.red('❌ فشل عرض المعاينة:'), error);
    }
  }

  // ============================================
  // 📊 تتبع الملفات المتغيرة (لـ Git Integration)
  // ============================================

  /**
   * الحصول على قائمة الملفات المتغيرة
   */
  getChangedFiles(): string[] {
    return Array.from(this.changedFiles);
  }

  /**
   * التحقق من وجود ملفات متغيرة
   */
  hasChangedFiles(): boolean {
    return this.changedFiles.size > 0;
  }

  /**
   * إعادة تعيين تتبع الملفات
   */
  clearTracking(): void {
    this.changedFiles.clear();
  }

  /**
   * عرض الملفات المتغيرة
   */
  displayChangedFiles(): void {
    if (!this.hasChangedFiles()) {
      console.log(chalk.yellow('\n⚠️  لا توجد ملفات متغيرة\n'));
      return;
    }

    const files = this.getChangedFiles();
    console.log(chalk.cyan(`\n📝 الملفات المتغيرة (${files.length}):`));
    console.log(chalk.gray('─'.repeat(60)));

    for (const file of files) {
      console.log(chalk.white(`  • ${file}`));
    }

    console.log(chalk.gray('─'.repeat(60) + '\n'));
  }
}

// إنشاء مدير ملفات للمجلد الحالي
export function createFileManager(workingDir?: string): FileManager {
  return new FileManager(workingDir);
}
