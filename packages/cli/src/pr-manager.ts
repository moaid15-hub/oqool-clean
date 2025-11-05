// pr-manager.ts
// ============================================
// 🔀 نظام إدارة Pull Requests
// ============================================

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

// ============================================
// 📊 واجهات البيانات
// ============================================

export interface PRTemplate {
  name: string;
  title: string;
  body: string;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
}

export interface PROptions {
  title?: string;
  body?: string;
  base?: string; // base branch
  head?: string; // source branch
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
  template?: string;
}

export interface PRInfo {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface PRStats {
  open: number;
  closed: number;
  merged: number;
  total: number;
}

// ============================================
// 🔀 مدير Pull Requests
// ============================================

export class PRManager {
  private workingDir: string;
  private templatesPath: string;
  private builtInTemplates: Map<string, PRTemplate>;

  constructor(workingDir: string = process.cwd()) {
    this.workingDir = workingDir;
    this.templatesPath = path.join(workingDir, '.oqool', 'pr-templates');
    this.builtInTemplates = new Map();

    this.loadBuiltInTemplates();
  }

  /**
   * تحميل القوالب المدمجة
   */
  private loadBuiltInTemplates(): void {
    // Feature Template
    this.builtInTemplates.set('feature', {
      name: 'feature',
      title: '✨ Feature: {{title}}',
      body: `## 📝 الوصف
{{description}}

## ✨ الميزات الجديدة
- {{feature1}}
- {{feature2}}

## 🧪 الاختبار
- [ ] تم اختبار الميزة يدوياً
- [ ] تم إضافة unit tests
- [ ] تم إضافة integration tests

## 📸 Screenshots (إن وجد)


## 📚 الوثائق
- [ ] تم تحديث README
- [ ] تم تحديث API docs

---
🤖 تم الإنشاء باستخدام Oqool Code
`,
      labels: ['enhancement', 'feature'],
    });

    // Bug Fix Template
    this.builtInTemplates.set('bugfix', {
      name: 'bugfix',
      title: '🐛 Fix: {{title}}',
      body: `## 🐛 المشكلة
{{problem}}

## 🔧 الحل
{{solution}}

## ✅ الاختبار
- [ ] تم إصلاح المشكلة
- [ ] لا توجد regressions
- [ ] تم إضافة tests لمنع تكرار المشكلة

## 📋 Related Issues
Closes #{{issue_number}}

---
🤖 تم الإنشاء باستخدام Oqool Code
`,
      labels: ['bug', 'fix'],
    });

    // Refactor Template
    this.builtInTemplates.set('refactor', {
      name: 'refactor',
      title: '♻️ Refactor: {{title}}',
      body: `## ♻️ التحسينات
{{improvements}}

## 📊 التغييرات
- {{change1}}
- {{change2}}

## 🔍 التأثير
- [ ] لا تأثير على الـ API
- [ ] لا تأثير على السلوك الحالي
- [ ] تحسن الأداء
- [ ] تحسن قابلية القراءة

## 🧪 الاختبار
- [ ] جميع الاختبارات الحالية تعمل
- [ ] تم إضافة اختبارات جديدة

---
🤖 تم الإنشاء باستخدام Oqool Code
`,
      labels: ['refactor'],
    });

    // Documentation Template
    this.builtInTemplates.set('docs', {
      name: 'docs',
      title: '📚 Docs: {{title}}',
      body: `## 📚 التحديثات
{{updates}}

## 📄 الملفات المعدلة
- {{file1}}
- {{file2}}

## ✅ Checklist
- [ ] تم تحديث README
- [ ] تم تحديث API documentation
- [ ] تم تحديث examples
- [ ] تم التحقق من الروابط

---
🤖 تم الإنشاء باستخدام Oqool Code
`,
      labels: ['documentation'],
    });

    // Hotfix Template
    this.builtInTemplates.set('hotfix', {
      name: 'hotfix',
      title: '🔥 Hotfix: {{title}}',
      body: `## 🚨 المشكلة العاجلة
{{urgent_issue}}

## 🔧 الإصلاح
{{fix}}

## ⚡ الأولوية
**عالية جداً** - يؤثر على production

## ✅ الاختبار العاجل
- [ ] تم الاختبار في production-like environment
- [ ] تم التحقق من عدم breaking changes
- [ ] تم إبلاغ الفريق

---
🤖 تم الإنشاء باستخدام Oqool Code
`,
      labels: ['hotfix', 'urgent', 'high-priority'],
    });
  }

  /**
   * التحقق من وجود gh CLI
   */
  private async checkGHCLI(): Promise<boolean> {
    try {
      await execAsync('gh --version', { cwd: this.workingDir });
      return true;
    } catch {
      console.log(chalk.red('\n❌ GitHub CLI (gh) غير مثبت'));
      console.log(chalk.yellow('قم بتثبيته من: https://cli.github.com/\n'));
      return false;
    }
  }

  /**
   * الحصول على الـ branch الحالي
   */
  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.workingDir });
      return stdout.trim();
    } catch {
      return 'main';
    }
  }

  /**
   * الحصول على الـ base branch الافتراضي
   */
  private async getDefaultBaseBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD', {
        cwd: this.workingDir,
      });
      const branch = stdout.trim().replace('refs/remotes/origin/', '');
      return branch || 'main';
    } catch {
      return 'main';
    }
  }

  /**
   * استبدال المتغيرات في القالب
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * إنشاء PR من قالب
   */
  async createFromTemplate(
    templateName: string,
    variables: Record<string, string>,
    options: PROptions = {}
  ): Promise<boolean> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return false;
      }

      // الحصول على القالب
      let template = this.builtInTemplates.get(templateName);

      if (!template) {
        template = await this.loadCustomTemplate(templateName);
      }

      if (!template) {
        console.log(chalk.red(`❌ القالب "${templateName}" غير موجود`));
        return false;
      }

      console.log(chalk.cyan(`\n🔀 إنشاء PR من قالب: ${template.name}\n`));

      // استبدال المتغيرات
      const title = options.title || this.replaceVariables(template.title, variables);
      const body = options.body || this.replaceVariables(template.body, variables);

      // الحصول على الـ branches
      const head = options.head || (await this.getCurrentBranch());
      const base = options.base || (await this.getDefaultBaseBranch());

      // بناء الأمر
      let command = `gh pr create --title "${title}" --body "${body}" --base "${base}" --head "${head}"`;

      // إضافة options
      if (options.draft) {
        command += ' --draft';
      }

      const labels = options.labels || template.labels || [];
      if (labels.length > 0) {
        command += ` --label "${labels.join(',')}"`;
      }

      const reviewers = options.reviewers || template.reviewers || [];
      if (reviewers.length > 0) {
        command += ` --reviewer "${reviewers.join(',')}"`;
      }

      const assignees = options.assignees || template.assignees || [];
      if (assignees.length > 0) {
        command += ` --assignee "${assignees.join(',')}"`;
      }

      console.log(chalk.gray(`\n📤 تنفيذ: ${command}\n`));

      // إنشاء PR
      const { stdout } = await execAsync(command, { cwd: this.workingDir });

      console.log(chalk.green(`\n✅ تم إنشاء PR بنجاح!\n`));
      console.log(chalk.white(stdout));

      return true;
    } catch (error: any) {
      console.log(chalk.red(`\n❌ فشل إنشاء PR: ${error.message}\n`));
      return false;
    }
  }

  /**
   * إنشاء PR بشكل تفاعلي
   */
  async createInteractive(): Promise<boolean> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return false;
      }

      console.log(chalk.cyan('\n🔀 إنشاء Pull Request\n'));

      // اختيار القالب
      const templates = ['none', ...Array.from(this.builtInTemplates.keys())];

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'اختر قالب PR:',
          choices: templates,
          default: 'feature',
        },
        {
          type: 'input',
          name: 'title',
          message: 'عنوان PR:',
          validate: (input) => input.length > 0 || 'العنوان مطلوب',
        },
        {
          type: 'editor',
          name: 'body',
          message: 'وصف PR:',
          default: (answers: any) => {
            if (answers.template !== 'none') {
              const template = this.builtInTemplates.get(answers.template);
              return template?.body || '';
            }
            return '';
          },
        },
        {
          type: 'input',
          name: 'base',
          message: 'Base branch:',
          default: await this.getDefaultBaseBranch(),
        },
        {
          type: 'input',
          name: 'head',
          message: 'Head branch:',
          default: await this.getCurrentBranch(),
        },
        {
          type: 'confirm',
          name: 'draft',
          message: 'إنشاء كـ draft؟',
          default: false,
        },
        {
          type: 'input',
          name: 'labels',
          message: 'Labels (مفصولة بفواصل):',
          default: (answers: any) => {
            if (answers.template !== 'none') {
              const template = this.builtInTemplates.get(answers.template);
              return template?.labels?.join(', ') || '';
            }
            return '';
          },
        },
      ]);

      // إنشاء PR
      const options: PROptions = {
        title: answers.title,
        body: answers.body,
        base: answers.base,
        head: answers.head,
        draft: answers.draft,
        labels: answers.labels ? answers.labels.split(',').map((l: string) => l.trim()) : [],
      };

      return await this.create(options);
    } catch (error: any) {
      console.log(chalk.red(`\n❌ فشل إنشاء PR: ${error.message}\n`));
      return false;
    }
  }

  /**
   * إنشاء PR مباشرة
   */
  async create(options: PROptions): Promise<boolean> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return false;
      }

      const head = options.head || (await this.getCurrentBranch());
      const base = options.base || (await this.getDefaultBaseBranch());

      console.log(chalk.cyan(`\n🔀 إنشاء PR من ${head} إلى ${base}\n`));

      // بناء الأمر
      let command = 'gh pr create';

      if (options.title) {
        command += ` --title "${options.title}"`;
      }

      if (options.body) {
        command += ` --body "${options.body}"`;
      }

      command += ` --base "${base}" --head "${head}"`;

      if (options.draft) {
        command += ' --draft';
      }

      if (options.labels && options.labels.length > 0) {
        command += ` --label "${options.labels.join(',')}"`;
      }

      if (options.reviewers && options.reviewers.length > 0) {
        command += ` --reviewer "${options.reviewers.join(',')}"`;
      }

      if (options.assignees && options.assignees.length > 0) {
        command += ` --assignee "${options.assignees.join(',')}"`;
      }

      // إنشاء PR
      const { stdout } = await execAsync(command, { cwd: this.workingDir });

      console.log(chalk.green(`\n✅ تم إنشاء PR بنجاح!\n`));
      console.log(chalk.white(stdout));

      return true;
    } catch (error: any) {
      console.log(chalk.red(`\n❌ فشل إنشاء PR: ${error.message}\n`));
      return false;
    }
  }

  /**
   * عرض جميع PRs
   */
  async listPRs(state: 'open' | 'closed' | 'merged' | 'all' = 'open'): Promise<void> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return;
      }

      console.log(chalk.cyan(`\n📋 Pull Requests (${state}):\n`));

      const { stdout } = await execAsync(`gh pr list --state ${state}`, {
        cwd: this.workingDir,
      });

      if (!stdout.trim()) {
        console.log(chalk.yellow('⚠️  لا توجد Pull Requests\n'));
        return;
      }

      console.log(chalk.white(stdout));
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل عرض PRs: ${error.message}\n`));
    }
  }

  /**
   * عرض تفاصيل PR
   */
  async viewPR(number: number): Promise<void> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return;
      }

      console.log(chalk.cyan(`\n📋 تفاصيل PR #${number}:\n`));

      const { stdout } = await execAsync(`gh pr view ${number}`, {
        cwd: this.workingDir,
      });

      console.log(chalk.white(stdout));
      console.log('');
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل عرض PR: ${error.message}\n`));
    }
  }

  /**
   * دمج PR
   */
  async mergePR(number: number, method: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<boolean> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return false;
      }

      console.log(chalk.cyan(`\n🔀 دمج PR #${number} (${method})...\n`));

      await execAsync(`gh pr merge ${number} --${method}`, {
        cwd: this.workingDir,
      });

      console.log(chalk.green(`✅ تم دمج PR #${number} بنجاح!\n`));

      return true;
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل دمج PR: ${error.message}\n`));
      return false;
    }
  }

  /**
   * إغلاق PR
   */
  async closePR(number: number): Promise<boolean> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return false;
      }

      console.log(chalk.cyan(`\n❌ إغلاق PR #${number}...\n`));

      await execAsync(`gh pr close ${number}`, {
        cwd: this.workingDir,
      });

      console.log(chalk.green(`✅ تم إغلاق PR #${number}\n`));

      return true;
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل إغلاق PR: ${error.message}\n`));
      return false;
    }
  }

  /**
   * إحصائيات PRs
   */
  async getStats(): Promise<PRStats> {
    try {
      // التحقق من gh CLI
      if (!(await this.checkGHCLI())) {
        return { open: 0, closed: 0, merged: 0, total: 0 };
      }

      const states = ['open', 'closed', 'merged'];
      const counts: any = {};

      for (const state of states) {
        const { stdout } = await execAsync(`gh pr list --state ${state} --json number`, {
          cwd: this.workingDir,
        });

        const prs = JSON.parse(stdout || '[]');
        counts[state] = prs.length;
      }

      return {
        open: counts.open || 0,
        closed: counts.closed || 0,
        merged: counts.merged || 0,
        total: (counts.open || 0) + (counts.closed || 0) + (counts.merged || 0),
      };
    } catch (error) {
      return { open: 0, closed: 0, merged: 0, total: 0 };
    }
  }

  /**
   * عرض إحصائيات
   */
  async displayStats(): Promise<void> {
    const stats = await this.getStats();

    console.log(chalk.cyan('\n📊 إحصائيات Pull Requests:'));
    console.log(chalk.gray('═'.repeat(60)));

    console.log(chalk.green(`  ✓ مفتوحة: ${stats.open}`));
    console.log(chalk.red(`  ✗ مغلقة: ${stats.closed}`));
    console.log(chalk.blue(`  ✓ مدمجة: ${stats.merged}`));
    console.log(chalk.white(`  📊 الكل: ${stats.total}`));

    console.log(chalk.gray('═'.repeat(60) + '\n'));
  }

  /**
   * عرض القوالب
   */
  listTemplates(): void {
    console.log(chalk.cyan('\n📋 قوالب PR المتاحة:\n'));
    console.log(chalk.gray('═'.repeat(80)));

    for (const [name, template] of this.builtInTemplates.entries()) {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${template.title}`));

      if (template.labels && template.labels.length > 0) {
        console.log(chalk.gray(`    Labels: ${template.labels.join(', ')}`));
      }
    }

    console.log(chalk.gray('\n═'.repeat(80) + '\n'));
  }

  /**
   * تحميل قالب مخصص
   */
  private async loadCustomTemplate(name: string): Promise<PRTemplate | undefined> {
    try {
      const templatePath = path.join(this.templatesPath, `${name}.json`);

      if (await fs.pathExists(templatePath)) {
        return await fs.readJSON(templatePath);
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * حفظ قالب مخصص
   */
  async saveTemplate(template: PRTemplate): Promise<boolean> {
    try {
      await fs.ensureDir(this.templatesPath);

      const templatePath = path.join(this.templatesPath, `${template.name}.json`);
      await fs.writeJSON(templatePath, template, { spaces: 2 });

      console.log(chalk.green(`✅ تم حفظ القالب: ${template.name}`));

      return true;
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل حفظ القالب: ${error.message}`));
      return false;
    }
  }
}

// تصدير instance
export function createPRManager(workingDir?: string): PRManager {
  return new PRManager(workingDir);
}
