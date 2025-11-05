// git-manager.ts
// ============================================
// 🔀 نظام إدارة Git والتكامل التلقائي
// ============================================

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface GitOptions {
  autoCommit?: boolean;
  autoPush?: boolean;
  branchPrefix?: string;
  commitMessage?: string;
}

export interface GitResult {
  success: boolean;
  message?: string;
  error?: string;
  branch?: string;
  commit?: string;
}

export interface BranchInfo {
  current: string;
  isClean: boolean;
  hasRemote: boolean;
}

export interface DiffInfo {
  filesChanged: number;
  additions: number;
  deletions: number;
  diff: string;
}

// ============================================
// 🔀 مدير Git
// ============================================

export class GitManager {
  private workingDir: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
  }

  /**
   * التحقق من أن المجلد هو git repository
   */
  async isGitRepo(): Promise<boolean> {
    const gitPath = path.join(this.workingDir, '.git');
    return await fs.pathExists(gitPath);
  }

  /**
   * تشغيل أمر git
   */
  private async runGitCommand(
    args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const gitProcess = spawn('git', args, {
        cwd: this.workingDir,
      });

      gitProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      gitProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      gitProcess.on('close', (code: number | null) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0,
        });
      });

      gitProcess.on('error', (err: Error) => {
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: 1,
        });
      });
    });
  }

  /**
   * الحصول على معلومات الـ branch الحالي
   */
  async getCurrentBranch(): Promise<BranchInfo | null> {
    if (!(await this.isGitRepo())) {
      return null;
    }

    // اسم الـ branch
    const branchResult = await this.runGitCommand(['branch', '--show-current']);
    if (branchResult.exitCode !== 0) {
      return null;
    }

    const current = branchResult.stdout;

    // التحقق من النظافة
    const statusResult = await this.runGitCommand(['status', '--porcelain']);
    const isClean = statusResult.stdout === '';

    // التحقق من remote
    const remoteResult = await this.runGitCommand(['remote']);
    const hasRemote = remoteResult.stdout !== '';

    return {
      current,
      isClean,
      hasRemote,
    };
  }

  /**
   * توليد اسم branch من prompt
   */
  generateBranchName(prompt: string, prefix: string = 'feature'): string {
    // تحويل النص لاسم branch صالح
    let branchName = prompt
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // حذف الرموز الخاصة
      .replace(/\s+/g, '-') // استبدال المسافات بـ -
      .substring(0, 50); // تحديد الطول

    // إضافة timestamp لتجنب التكرار
    const timestamp = Date.now().toString().substring(-6);

    return `${prefix}/${branchName}-${timestamp}`;
  }

  /**
   * إنشاء branch جديد
   */
  async createBranch(branchName: string): Promise<GitResult> {
    if (!(await this.isGitRepo())) {
      return {
        success: false,
        error: 'ليس git repository',
      };
    }

    const result = await this.runGitCommand(['checkout', '-b', branchName]);

    if (result.exitCode === 0) {
      return {
        success: true,
        message: `تم إنشاء branch: ${branchName}`,
        branch: branchName,
      };
    } else {
      return {
        success: false,
        error: result.stderr || 'فشل إنشاء branch',
      };
    }
  }

  /**
   * التبديل إلى branch
   */
  async switchBranch(branchName: string): Promise<GitResult> {
    const result = await this.runGitCommand(['checkout', branchName]);

    if (result.exitCode === 0) {
      return {
        success: true,
        message: `تم التبديل إلى: ${branchName}`,
        branch: branchName,
      };
    } else {
      return {
        success: false,
        error: result.stderr,
      };
    }
  }

  /**
   * إضافة ملفات للـ staging
   */
  async addFiles(files: string[]): Promise<GitResult> {
    if (files.length === 0) {
      return {
        success: false,
        error: 'لا توجد ملفات لإضافتها',
      };
    }

    const result = await this.runGitCommand(['add', ...files]);

    if (result.exitCode === 0) {
      return {
        success: true,
        message: `تم إضافة ${files.length} ملف(ات)`,
      };
    } else {
      return {
        success: false,
        error: result.stderr,
      };
    }
  }

  /**
   * عمل commit
   */
  async commit(message: string): Promise<GitResult> {
    const result = await this.runGitCommand(['commit', '-m', message]);

    if (result.exitCode === 0) {
      // استخراج commit hash
      const hashResult = await this.runGitCommand(['rev-parse', '--short', 'HEAD']);
      const commitHash = hashResult.stdout;

      return {
        success: true,
        message: `تم عمل commit: ${commitHash}`,
        commit: commitHash,
      };
    } else {
      return {
        success: false,
        error: result.stderr,
      };
    }
  }

  /**
   * عرض الـ diff
   */
  async getDiff(staged: boolean = false): Promise<DiffInfo | null> {
    const args = staged ? ['diff', '--staged', '--stat'] : ['diff', '--stat'];
    const statResult = await this.runGitCommand(args);

    if (statResult.exitCode !== 0) {
      return null;
    }

    // استخراج الإحصائيات
    const stats = statResult.stdout;
    const filesChanged = (stats.match(/\d+ files? changed/)?.[0] || '0 files changed').split(
      ' '
    )[0];
    const additions = stats.match(/(\d+) insertions?/)?.[1] || '0';
    const deletions = stats.match(/(\d+) deletions?/)?.[1] || '0';

    // الحصول على diff كامل
    const diffArgs = staged ? ['diff', '--staged'] : ['diff'];
    const diffResult = await this.runGitCommand(diffArgs);

    return {
      filesChanged: parseInt(filesChanged),
      additions: parseInt(additions),
      deletions: parseInt(deletions),
      diff: diffResult.stdout,
    };
  }

  /**
   * عرض diff بشكل جميل
   */
  async displayDiff(staged: boolean = false): Promise<void> {
    const diff = await this.getDiff(staged);

    if (!diff) {
      console.log(chalk.yellow('\n⚠️  لا توجد تغييرات\n'));
      return;
    }

    console.log(chalk.cyan('\n📊 التغييرات:'));
    console.log(chalk.gray('═'.repeat(60)));
    console.log(chalk.white(`📁 الملفات: ${diff.filesChanged}`));
    console.log(chalk.green(`+ إضافات: ${diff.additions}`));
    console.log(chalk.red(`- حذف: ${diff.deletions}`));
    console.log(chalk.gray('═'.repeat(60)));

    // عرض الـ diff (أول 50 سطر)
    const diffLines = diff.diff.split('\n').slice(0, 50);
    for (const line of diffLines) {
      if (line.startsWith('+')) {
        console.log(chalk.green(line));
      } else if (line.startsWith('-')) {
        console.log(chalk.red(line));
      } else if (line.startsWith('@@')) {
        console.log(chalk.cyan(line));
      } else {
        console.log(chalk.gray(line));
      }
    }

    if (diff.diff.split('\n').length > 50) {
      console.log(chalk.yellow('\n... (المزيد من التغييرات)\n'));
    }

    console.log(chalk.gray('═'.repeat(60) + '\n'));
  }

  /**
   * الحصول على قائمة الملفات المعدلة
   */
  async getModifiedFiles(): Promise<string[]> {
    const result = await this.runGitCommand(['diff', '--name-only']);

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    return result.stdout.split('\n').filter((f) => f.trim() !== '');
  }

  /**
   * الحصول على قائمة الملفات غير المتتبعة
   */
  async getUntrackedFiles(): Promise<string[]> {
    const result = await this.runGitCommand(['ls-files', '--others', '--exclude-standard']);

    if (result.exitCode !== 0 || !result.stdout) {
      return [];
    }

    return result.stdout.split('\n').filter((f) => f.trim() !== '');
  }

  /**
   * push للـ remote
   */
  async push(branch?: string, setUpstream: boolean = false): Promise<GitResult> {
    const branchInfo = await this.getCurrentBranch();

    if (!branchInfo) {
      return {
        success: false,
        error: 'فشل الحصول على معلومات الـ branch',
      };
    }

    if (!branchInfo.hasRemote) {
      return {
        success: false,
        error: 'لا يوجد remote مُعرف',
      };
    }

    const targetBranch = branch || branchInfo.current;
    const args = setUpstream
      ? ['push', '-u', 'origin', targetBranch]
      : ['push', 'origin', targetBranch];

    const result = await this.runGitCommand(args);

    if (result.exitCode === 0) {
      return {
        success: true,
        message: `تم push إلى origin/${targetBranch}`,
        branch: targetBranch,
      };
    } else {
      return {
        success: false,
        error: result.stderr,
      };
    }
  }

  /**
   * توليد رسالة commit من الملفات
   */
  generateCommitMessage(files: string[], prompt?: string): string {
    if (prompt) {
      // استخدام الـ prompt كأساس
      const shortPrompt = prompt.substring(0, 50);
      return `feat: ${shortPrompt}\n\n🤖 Generated with Oqool Code`;
    }

    // توليد رسالة من أسماء الملفات
    const fileNames = files.map((f) => path.basename(f)).slice(0, 3);
    const fileList = fileNames.join(', ');
    const moreFiles = files.length > 3 ? ` + ${files.length - 3} more` : '';

    return `chore: update ${fileList}${moreFiles}\n\n🤖 Generated with Oqool Code`;
  }

  /**
   * Workflow كامل: branch + commit + diff + (optional) push
   */
  async autoWorkflow(
    files: string[],
    prompt: string,
    options: GitOptions = {}
  ): Promise<GitResult> {
    const {
      autoCommit = true,
      autoPush = false,
      branchPrefix = 'feature',
      commitMessage,
    } = options;

    // التحقق من git repo
    if (!(await this.isGitRepo())) {
      return {
        success: false,
        error: 'ليس git repository',
      };
    }

    try {
      // 1. الحصول على branch الحالي
      const branchInfo = await this.getCurrentBranch();
      if (!branchInfo) {
        throw new Error('فشل الحصول على معلومات الـ branch');
      }

      console.log(chalk.cyan(`\n🌿 Branch الحالي: ${branchInfo.current}\n`));

      // 2. إنشاء branch جديد
      const branchName = this.generateBranchName(prompt, branchPrefix);
      console.log(chalk.cyan(`🔀 إنشاء branch جديد: ${branchName}...`));

      const createResult = await this.createBranch(branchName);
      if (!createResult.success) {
        throw new Error(createResult.error);
      }
      console.log(chalk.green(`✅ ${createResult.message}\n`));

      // 3. إضافة الملفات
      console.log(chalk.cyan(`📦 إضافة ${files.length} ملف(ات)...`));
      const addResult = await this.addFiles(files);
      if (!addResult.success) {
        throw new Error(addResult.error);
      }
      console.log(chalk.green(`✅ ${addResult.message}\n`));

      // 4. عرض الـ diff
      await this.displayDiff(true);

      // 5. commit
      if (autoCommit) {
        const message = commitMessage || this.generateCommitMessage(files, prompt);
        console.log(chalk.cyan(`💾 عمل commit...`));

        const commitResult = await this.commit(message);
        if (!commitResult.success) {
          throw new Error(commitResult.error);
        }
        console.log(chalk.green(`✅ ${commitResult.message}\n`));
      }

      // 6. push (إذا كان مطلوب)
      if (autoPush) {
        console.log(chalk.cyan(`🚀 Push إلى remote...`));
        const pushResult = await this.push(branchName, true);
        if (!pushResult.success) {
          console.log(chalk.yellow(`⚠️  ${pushResult.error}\n`));
        } else {
          console.log(chalk.green(`✅ ${pushResult.message}\n`));
        }
      }

      return {
        success: true,
        message: 'تم بنجاح',
        branch: branchName,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// تصدير instance جاهز
export function createGitManager(workingDir?: string): GitManager {
  return new GitManager(workingDir);
}
