// git-helper.ts
// ============================================
// 🔀 Git Integration - إدارة git ذكية
// ============================================

import { spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs-extra';
import { join } from 'path';

export interface GitStatus {
  isRepo: boolean;
  branch: string;
  hasChanges: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export class GitHelper {
  private workingDirectory: string;

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory;
  }

  // ============================================
  // 📊 الحصول على حالة Git
  // ============================================
  async getStatus(): Promise<GitStatus> {
    const status: GitStatus = {
      isRepo: await this.isGitRepo(),
      branch: '',
      hasChanges: false,
      staged: [],
      unstaged: [],
      untracked: [],
    };

    if (!status.isRepo) {
      return status;
    }

    try {
      // الحصول على اسم الفرع
      const branchResult = await this.execGit(['branch', '--show-current']);
      status.branch = branchResult.trim();

      // الحصول على التغييرات
      const statusResult = await this.execGit(['status', '--porcelain']);
      const lines = statusResult.split('\n').filter((l) => l.trim());

      for (const line of lines) {
        const code = line.substring(0, 2);
        const file = line.substring(3).trim();

        if (code === '??') {
          status.untracked.push(file);
        } else if (code[0] !== ' ') {
          status.staged.push(file);
        } else if (code[1] !== ' ') {
          status.unstaged.push(file);
        }
      }

      status.hasChanges =
        status.staged.length > 0 || status.unstaged.length > 0 || status.untracked.length > 0;
    } catch (error) {
      console.error(chalk.red('خطأ في الحصول على git status'));
    }

    return status;
  }

  // ============================================
  // 🔍 التحقق من وجود Git repo
  // ============================================
  private async isGitRepo(): Promise<boolean> {
    try {
      await this.execGit(['rev-parse', '--git-dir']);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // ➕ إضافة ملفات للـ staging
  // ============================================
  async add(files: string[] | string): Promise<boolean> {
    const filesList = Array.isArray(files) ? files : [files];

    try {
      await this.execGit(['add', ...filesList]);
      console.log(chalk.green(`✅ تم إضافة ${filesList.length} ملف`));
      return true;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل الإضافة: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 💾 إنشاء commit
  // ============================================
  async commit(message: string): Promise<boolean> {
    try {
      await this.execGit(['commit', '-m', message]);
      console.log(chalk.green('✅ تم إنشاء commit'));
      return true;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل الـ commit: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 📤 Push للـ remote
  // ============================================
  async push(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      const status = await this.getStatus();
      const targetBranch = branch || status.branch;

      await this.execGit(['push', remote, targetBranch]);
      console.log(chalk.green(`✅ تم push إلى ${remote}/${targetBranch}`));
      return true;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل الـ push: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 🔀 إنشاء Pull Request (GitHub)
  // ============================================
  async createPR(title: string, body: string, baseBranch: string = 'main'): Promise<boolean> {
    try {
      // التحقق من وجود gh CLI
      const hasGH = await this.checkCommand('gh');

      if (!hasGH) {
        console.log(chalk.yellow('⚠️ gh CLI غير مثبت. قم بتثبيته من: https://cli.github.com'));
        return false;
      }

      // إنشاء PR
      const result = await this.execCommand('gh', [
        'pr',
        'create',
        '--title',
        title,
        '--body',
        body,
        '--base',
        baseBranch,
      ]);

      console.log(chalk.green('✅ تم إنشاء Pull Request'));
      console.log(chalk.blue(result));
      return true;
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل إنشاء PR: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 📜 الحصول على آخر commits
  // ============================================
  async getRecentCommits(count: number = 10): Promise<CommitInfo[]> {
    try {
      const format = '%H|%s|%an|%ad';
      const result = await this.execGit([
        'log',
        `-${count}`,
        `--pretty=format:${format}`,
        '--date=short',
      ]);

      const lines = result.split('\n');
      const commits: CommitInfo[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        const [hash, message, author, date] = line.split('|');
        commits.push({ hash, message, author, date });
      }

      return commits;
    } catch (error) {
      return [];
    }
  }

  // ============================================
  // 🔍 الفرق بين commits
  // ============================================
  async getDiff(commit1?: string, commit2?: string): Promise<string> {
    try {
      const args = ['diff'];

      if (commit1) {
        args.push(commit1);
        if (commit2) args.push(commit2);
      }

      return await this.execGit(args);
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل الحصول على diff: ${error.message}`));
      return '';
    }
  }

  // ============================================
  // 🎯 Smart Commit - commit ذكي مع رسالة مولدة
  // ============================================
  async smartCommit(): Promise<boolean> {
    try {
      // الحصول على الحالة
      const status = await this.getStatus();

      if (!status.hasChanges) {
        console.log(chalk.yellow('⚠️ لا توجد تغييرات للـ commit'));
        return false;
      }

      // الحصول على الـ diff
      const diff = await this.getDiff();

      // توليد رسالة commit بناءً على التغييرات
      const message = this.generateCommitMessage(status, diff);

      console.log(chalk.cyan('📝 رسالة الـ commit المولدة:'));
      console.log(chalk.gray(message));

      // إضافة جميع التغييرات
      if (status.unstaged.length > 0) {
        await this.add(status.unstaged);
      }

      // إنشاء commit
      return await this.commit(message);
    } catch (error: any) {
      console.error(chalk.red(`❌ فشل smart commit: ${error.message}`));
      return false;
    }
  }

  // ============================================
  // 📝 توليد رسالة commit
  // ============================================
  private generateCommitMessage(status: GitStatus, diff: string): string {
    const changedFiles = [...status.staged, ...status.unstaged];

    // تحليل نوع التغيير
    let type = 'chore';

    if (changedFiles.some((f) => f.includes('test'))) {
      type = 'test';
    } else if (changedFiles.some((f) => f.includes('doc') || f.endsWith('.md'))) {
      type = 'docs';
    } else if (diff.includes('bug') || diff.includes('fix')) {
      type = 'fix';
    } else if (diff.includes('add') || diff.includes('new')) {
      type = 'feat';
    }

    // إنشاء رسالة بسيطة
    const scope = changedFiles[0]?.split('/')[0] || 'project';
    const description = `update ${changedFiles.length} file(s)`;

    return `${type}(${scope}): ${description}`;
  }

  // ============================================
  // ⚙️ تنفيذ أمر git
  // ============================================
  private execGit(args: string[]): Promise<string> {
    return this.execCommand('git', args);
  }

  // ============================================
  // ⚙️ تنفيذ أمر عام
  // ============================================
  private execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.workingDirectory,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || stdout));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  // ============================================
  // ✅ التحقق من وجود أمر
  // ============================================
  private async checkCommand(command: string): Promise<boolean> {
    try {
      await this.execCommand('which', [command]);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================
  // 📊 عرض حالة Git بشكل جميل
  // ============================================
  async displayStatus(): Promise<void> {
    const status = await this.getStatus();

    console.log(chalk.cyan('\n📊 حالة Git:'));
    console.log(chalk.gray('━'.repeat(60)));

    if (!status.isRepo) {
      console.log(chalk.red('❌ ليس git repository'));
      return;
    }

    console.log(chalk.blue(`🌿 الفرع: ${status.branch}`));

    if (!status.hasChanges) {
      console.log(chalk.green('✅ لا توجد تغييرات'));
      console.log(chalk.gray('━'.repeat(60)) + '\n');
      return;
    }

    if (status.staged.length > 0) {
      console.log(chalk.green(`\n📦 Staged (${status.staged.length}):`));
      status.staged.slice(0, 5).forEach((f) => console.log(chalk.gray(`   + ${f}`)));
      if (status.staged.length > 5) {
        console.log(chalk.gray(`   ... و ${status.staged.length - 5} ملف آخر`));
      }
    }

    if (status.unstaged.length > 0) {
      console.log(chalk.yellow(`\n✏️  Modified (${status.unstaged.length}):`));
      status.unstaged.slice(0, 5).forEach((f) => console.log(chalk.gray(`   ~ ${f}`)));
      if (status.unstaged.length > 5) {
        console.log(chalk.gray(`   ... و ${status.unstaged.length - 5} ملف آخر`));
      }
    }

    if (status.untracked.length > 0) {
      console.log(chalk.cyan(`\n➕ Untracked (${status.untracked.length}):`));
      status.untracked.slice(0, 5).forEach((f) => console.log(chalk.gray(`   ? ${f}`)));
      if (status.untracked.length > 5) {
        console.log(chalk.gray(`   ... و ${status.untracked.length - 5} ملف آخر`));
      }
    }

    console.log(chalk.gray('━'.repeat(60)) + '\n');
  }
}
