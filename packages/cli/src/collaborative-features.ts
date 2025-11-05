// collaborative-features.ts
// ============================================
// 👥 ميزات التعاون للفرق
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { OqoolAPIClient } from './api-client.js';
import { FileManager } from './file-manager.js';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  avatar?: string;
  lastActive: string;
  permissions: {
    canGenerate: boolean;
    canModify: boolean;
    canReview: boolean;
    canManage: boolean;
  };
}

export interface ProjectSession {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  members: string[];
  files: string[];
  status: 'active' | 'paused' | 'completed';
  lastActivity: string;
  sharedCode: Map<string, string>;
}

export interface CodeReview {
  id: string;
  title: string;
  description: string;
  files: string[];
  reviewer: string;
  reviewee: string;
  status: 'pending' | 'in-progress' | 'approved' | 'rejected' | 'changes-requested';
  comments: ReviewComment[];
  createdAt: string;
  completedAt?: string;
}

export interface ReviewComment {
  id: string;
  file: string;
  line: number;
  type: 'suggestion' | 'issue' | 'praise';
  content: string;
  author: string;
  timestamp: string;
  resolved: boolean;
}

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  files: Array<{
    path: string;
    content: string;
    variables: string[];
  }>;
  createdBy: string;
  tags: string[];
  usageCount: number;
  rating: number;
}

export class CollaborativeFeatures {
  private apiClient: OqoolAPIClient;
  private fileManager: FileManager;
  private workingDir: string;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.fileManager = new FileManager(workingDir);
    this.workingDir = workingDir;
  }

  /**
   * إنشاء جلسة تعاون
   */
  async createSession(
    name: string,
    description: string,
    members: string[]
  ): Promise<ProjectSession> {
    const spinner = ora('إنشاء جلسة التعاون...').start();

    try {
      const session: ProjectSession = {
        id: this.generateId(),
        name,
        description,
        createdBy: 'current_user', // سيتم الحصول عليه من auth
        createdAt: new Date().toISOString(),
        members,
        files: [],
        status: 'active',
        lastActivity: new Date().toISOString(),
        sharedCode: new Map(),
      };

      // حفظ الجلسة محلياً
      const sessionsPath = path.join(this.workingDir, '.oqool', 'sessions');
      await fs.ensureDir(sessionsPath);

      const sessionPath = path.join(sessionsPath, `${session.id}.json`);
      await fs.writeJson(sessionPath, session, { spaces: 2 });

      spinner.succeed('تم إنشاء جلسة التعاون بنجاح!');
      console.log(chalk.green(`\n📋 جلسة: ${name}`));
      console.log(chalk.cyan(`   الأعضاء: ${members.length} عضو`));
      console.log(chalk.gray(`   معرف الجلسة: ${session.id}\n`));

      return session;
    } catch (error) {
      spinner.fail('فشل في إنشاء الجلسة');
      throw error;
    }
  }

  /**
   * دعوة عضو للجلسة
   */
  async inviteMember(
    sessionId: string,
    email: string,
    role: TeamMember['role'] = 'member'
  ): Promise<void> {
    const spinner = ora('إرسال الدعوة...').start();

    try {
      // قراءة الجلسة
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('الجلسة غير موجودة');
      }

      // إضافة العضو
      if (!session.members.includes(email)) {
        session.members.push(email);
        session.lastActivity = new Date().toISOString();

        // حفظ التحديث
        await this.saveSession(session);
      }

      spinner.succeed('تم إرسال الدعوة بنجاح!');
      console.log(chalk.green(`\n📧 دعوة مرسلة إلى: ${email}`));
      console.log(chalk.cyan(`   الدور: ${this.getRoleName(role)}`));
      console.log(chalk.gray(`   رابط الانضمام: https://oqool.net/session/${sessionId}\n`));
    } catch (error) {
      spinner.fail('فشل في إرسال الدعوة');
      throw error;
    }
  }

  /**
   * مشاركة كود في الجلسة
   */
  async shareCode(sessionId: string, files: string[]): Promise<void> {
    const spinner = ora('مشاركة الكود...').start();

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error('الجلسة غير موجودة');
      }

      // قراءة الملفات
      for (const file of files) {
        const content = await this.fileManager.readFile(file);
        if (content) {
          session.sharedCode.set(file, content);
          session.lastActivity = new Date().toISOString();
        }
      }

      // تحديث قائمة الملفات
      session.files = Array.from(session.sharedCode.keys());

      await this.saveSession(session);

      spinner.succeed('تم مشاركة الكود بنجاح!');
      console.log(chalk.green(`\n📤 تم مشاركة ${files.length} ملف`));
      console.log(chalk.cyan(`   في الجلسة: ${session.name}\n`));
    } catch (error) {
      spinner.fail('فشل في مشاركة الكود');
      throw error;
    }
  }

  /**
   * إنشاء مراجعة كود
   */
  async createCodeReview(
    title: string,
    description: string,
    files: string[],
    reviewer: string
  ): Promise<CodeReview> {
    const spinner = ora('إنشاء مراجعة الكود...').start();

    try {
      const review: CodeReview = {
        id: this.generateId(),
        title,
        description,
        files,
        reviewer,
        reviewee: 'current_user',
        status: 'pending',
        comments: [],
        createdAt: new Date().toISOString(),
      };

      // حفظ المراجعة
      const reviewsPath = path.join(this.workingDir, '.oqool', 'reviews');
      await fs.ensureDir(reviewsPath);

      const reviewPath = path.join(reviewsPath, `${review.id}.json`);
      await fs.writeJson(reviewPath, review, { spaces: 2 });

      spinner.succeed('تم إنشاء مراجعة الكود!');
      console.log(chalk.green(`\n🔍 مراجعة: ${title}`));
      console.log(chalk.cyan(`   الملفات: ${files.length}`));
      console.log(chalk.gray(`   المراجع: ${reviewer}\n`));

      return review;
    } catch (error) {
      spinner.fail('فشل في إنشاء المراجعة');
      throw error;
    }
  }

  /**
   * إضافة تعليق للمراجعة
   */
  async addReviewComment(
    reviewId: string,
    file: string,
    line: number,
    type: ReviewComment['type'],
    content: string
  ): Promise<void> {
    const spinner = ora('إضافة التعليق...').start();

    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error('المراجعة غير موجودة');
      }

      const comment: ReviewComment = {
        id: this.generateId(),
        file,
        line,
        type,
        content,
        author: 'current_user',
        timestamp: new Date().toISOString(),
        resolved: false,
      };

      review.comments.push(comment);
      review.status = 'in-progress';

      await this.saveReview(review);

      spinner.succeed('تم إضافة التعليق!');
      const typeEmoji = type === 'issue' ? '❌' : type === 'suggestion' ? '💡' : '✅';
      console.log(chalk.green(`\n${typeEmoji} ${file}:${line} - ${content}\n`));
    } catch (error) {
      spinner.fail('فشل في إضافة التعليق');
      throw error;
    }
  }

  /**
   * إنشاء قالب فريق
   */
  async createTeamTemplate(
    name: string,
    description: string,
    category: string,
    files: string[],
    tags: string[] = []
  ): Promise<TeamTemplate> {
    const spinner = ora('إنشاء القالب...').start();

    try {
      const templateFiles: Array<{ path: string; content: string; variables: string[] }> = [];

      for (const file of files) {
        const content = await this.fileManager.readFile(file);
        if (content) {
          // استخراج المتغيرات من المحتوى
          const variables = this.extractVariables(content);

          templateFiles.push({
            path: file,
            content,
            variables,
          });
        }
      }

      const template: TeamTemplate = {
        id: this.generateId(),
        name,
        description,
        category,
        files: templateFiles,
        createdBy: 'current_user',
        tags,
        usageCount: 0,
        rating: 0,
      };

      // حفظ القالب
      const templatesPath = path.join(this.workingDir, '.oqool', 'team-templates');
      await fs.ensureDir(templatesPath);

      const templatePath = path.join(templatesPath, `${template.id}.json`);
      await fs.writeJson(templatePath, template, { spaces: 2 });

      spinner.succeed('تم إنشاء القالب بنجاح!');
      console.log(chalk.green(`\n📋 قالب: ${name}`));
      console.log(chalk.cyan(`   الملفات: ${files.length}`));
      console.log(chalk.gray(`   الفئة: ${category}\n`));

      return template;
    } catch (error) {
      spinner.fail('فشل في إنشاء القالب');
      throw error;
    }
  }

  /**
   * البحث في قوالب الفريق
   */
  async searchTeamTemplates(query: string): Promise<TeamTemplate[]> {
    try {
      const templatesPath = path.join(this.workingDir, '.oqool', 'team-templates');

      if (!(await fs.pathExists(templatesPath))) {
        return [];
      }

      const templates: TeamTemplate[] = [];
      const files = await fs.readdir(templatesPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const templatePath = path.join(templatesPath, file);
          const template: TeamTemplate = await fs.readJson(templatePath);

          if (
            template.name.toLowerCase().includes(query.toLowerCase()) ||
            template.description.toLowerCase().includes(query.toLowerCase()) ||
            template.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())) ||
            template.category.toLowerCase().includes(query.toLowerCase())
          ) {
            templates.push(template);
          }
        }
      }

      return templates.sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error(chalk.red('❌ فشل في البحث في القوالب:'), error);
      return [];
    }
  }

  /**
   * إنشاء تقرير تعاون
   */
  async generateCollaborationReport(): Promise<void> {
    const spinner = ora('إنشاء تقرير التعاون...').start();

    try {
      const reportPath = path.join(this.workingDir, '.oqool', 'collaboration-report.md');

      let report = `# 📊 تقرير التعاون - ${new Date().toLocaleDateString('ar')}\n\n`;

      // جلسات التعاون
      const sessions = await this.getAllSessions();
      report += `## 👥 جلسات التعاون\n\n`;
      report += `**الإجمالي:** ${sessions.length} جلسة\n\n`;

      for (const session of sessions.slice(0, 5)) {
        report += `### ${session.name}\n`;
        report += `- **الأعضاء:** ${session.members.length}\n`;
        report += `- **الملفات:** ${session.files.length}\n`;
        report += `- **الحالة:** ${session.status}\n`;
        report += `- **آخر نشاط:** ${new Date(session.lastActivity).toLocaleString('ar')}\n\n`;
      }

      // مراجعات الكود
      const reviews = await this.getAllReviews();
      report += `## 🔍 مراجعات الكود\n\n`;
      report += `**الإجمالي:** ${reviews.length} مراجعة\n\n`;

      const statusCounts = new Map<string, number>();
      for (const review of reviews) {
        statusCounts.set(review.status, (statusCounts.get(review.status) || 0) + 1);
      }

      for (const [status, count] of statusCounts.entries()) {
        report += `- **${this.getStatusName(status)}:** ${count}\n`;
      }
      report += `\n`;

      // قوالب الفريق
      const templates = await this.getAllTemplates();
      report += `## 📋 قوالب الفريق\n\n`;
      report += `**الإجمالي:** ${templates.length} قالب\n\n`;

      const categoryCounts = new Map<string, number>();
      for (const template of templates) {
        categoryCounts.set(template.category, (categoryCounts.get(template.category) || 0) + 1);
      }

      for (const [category, count] of categoryCounts.entries()) {
        report += `- **${category}:** ${count}\n`;
      }
      report += `\n`;

      // التوصيات
      report += `## 💡 التوصيات\n\n`;

      if (sessions.length === 0) {
        report += `- ابدأ بإنشاء جلسة تعاون لتنسيق العمل\n`;
      }

      if (reviews.filter((r) => r.status === 'pending').length > 0) {
        report += `- راجع المراجعات المعلقة\n`;
      }

      if (templates.length < 3) {
        report += `- أنشئ المزيد من القوالب للاستخدام الشائع\n`;
      }

      report += `\n---\n\n`;
      report += `*تم إنشاء التقرير بواسطة Oqool Code*\n`;

      await fs.ensureDir(path.dirname(reportPath));
      await fs.writeFile(reportPath, report);

      spinner.succeed('تم إنشاء تقرير التعاون!');
      console.log(chalk.green(`\n📄 التقرير محفوظ في: ${reportPath}\n`));
    } catch (error) {
      spinner.fail('فشل في إنشاء التقرير');
      throw error;
    }
  }

  /**
   * الحصول على جلسة
   */
  private async getSession(sessionId: string): Promise<ProjectSession | null> {
    const sessionPath = path.join(this.workingDir, '.oqool', 'sessions', `${sessionId}.json`);

    if (await fs.pathExists(sessionPath)) {
      return await fs.readJson(sessionPath);
    }

    return null;
  }

  /**
   * حفظ جلسة
   */
  private async saveSession(session: ProjectSession): Promise<void> {
    const sessionsPath = path.join(this.workingDir, '.oqool', 'sessions');
    await fs.ensureDir(sessionsPath);

    const sessionPath = path.join(sessionsPath, `${session.id}.json`);
    await fs.writeJson(sessionPath, session, { spaces: 2 });
  }

  /**
   * الحصول على مراجعة
   */
  private async getReview(reviewId: string): Promise<CodeReview | null> {
    const reviewPath = path.join(this.workingDir, '.oqool', 'reviews', `${reviewId}.json`);

    if (await fs.pathExists(reviewPath)) {
      return await fs.readJson(reviewPath);
    }

    return null;
  }

  /**
   * حفظ مراجعة
   */
  private async saveReview(review: CodeReview): Promise<void> {
    const reviewsPath = path.join(this.workingDir, '.oqool', 'reviews');
    await fs.ensureDir(reviewsPath);

    const reviewPath = path.join(reviewsPath, `${review.id}.json`);
    await fs.writeJson(reviewPath, review, { spaces: 2 });
  }

  /**
   * الحصول على جميع الجلسات
   */
  private async getAllSessions(): Promise<ProjectSession[]> {
    const sessionsPath = path.join(this.workingDir, '.oqool', 'sessions');

    if (!(await fs.pathExists(sessionsPath))) {
      return [];
    }

    const files = await fs.readdir(sessionsPath);
    const sessions: ProjectSession[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionPath = path.join(sessionsPath, file);
        const session = await fs.readJson(sessionPath);
        sessions.push(session);
      }
    }

    return sessions.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * الحصول على جميع المراجعات
   */
  private async getAllReviews(): Promise<CodeReview[]> {
    const reviewsPath = path.join(this.workingDir, '.oqool', 'reviews');

    if (!(await fs.pathExists(reviewsPath))) {
      return [];
    }

    const files = await fs.readdir(reviewsPath);
    const reviews: CodeReview[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const reviewPath = path.join(reviewsPath, file);
        const review = await fs.readJson(reviewPath);
        reviews.push(review);
      }
    }

    return reviews.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * الحصول على جميع القوالب
   */
  private async getAllTemplates(): Promise<TeamTemplate[]> {
    const templatesPath = path.join(this.workingDir, '.oqool', 'team-templates');

    if (!(await fs.pathExists(templatesPath))) {
      return [];
    }

    const files = await fs.readdir(templatesPath);
    const templates: TeamTemplate[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const templatePath = path.join(templatesPath, file);
        const template = await fs.readJson(templatePath);
        templates.push(template);
      }
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * استخراج المتغيرات من المحتوى
   */
  private extractVariables(content: string): string[] {
    const variables: string[] = [];
    const regex = /\{\{(\w+)\}\}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * الحصول على اسم الدور
   */
  private getRoleName(role: TeamMember['role']): string {
    const roleNames = {
      owner: 'مالك',
      admin: 'مدير',
      member: 'عضو',
      viewer: 'مراقب',
    };
    return roleNames[role];
  }

  /**
   * الحصول على اسم الحالة
   */
  private getStatusName(status: string): string {
    const statusNames = {
      pending: 'معلقة',
      'in-progress': 'قيد التنفيذ',
      approved: 'معتمدة',
      rejected: 'مرفوضة',
      'changes-requested': 'تغييرات مطلوبة',
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }
}

// مصنع لإنشاء instance
export function createCollaborativeFeatures(
  apiClient: OqoolAPIClient,
  workingDir?: string
): CollaborativeFeatures {
  return new CollaborativeFeatures(apiClient, workingDir);
}
