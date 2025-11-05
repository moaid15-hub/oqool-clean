import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * حالة المهمة
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

/**
 * أولوية المهمة
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * معلومات مهمة
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  assignee?: string;
  dependencies: string[];
  progress: number; // 0-100
}

/**
 * معلومات Milestone
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: number;
  tasks: string[];
  completed: boolean;
  progress: number;
}

/**
 * إحصائيات المشروع
 */
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  completionRate: number;
  averageTaskTime: number;
  estimatedCompletion?: number;
  velocity: number; // tasks per week
}

/**
 * تقرير التقدم
 */
export interface ProgressReport {
  generatedAt: number;
  period: {
    from: number;
    to: number;
  };
  stats: ProjectStats;
  milestones: Milestone[];
  recentTasks: Task[];
  blockers: Task[];
  recommendations: string[];
}

/**
 * متتبع التقدم
 */
export class ProgressTracker {
  private workingDir: string;
  private dataPath: string;
  private tasks: Map<string, Task>;
  private milestones: Map<string, Milestone>;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
    this.dataPath = path.join(workingDir, '.oqool', 'progress');
    this.tasks = new Map();
    this.milestones = new Map();
  }

  /**
   * تهيئة المتتبع
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.dataPath, { recursive: true });
    await this.loadData();
  }

  /**
   * إنشاء مهمة جديدة
   */
  async createTask(
    title: string,
    options: {
      description?: string;
      priority?: TaskPriority;
      estimatedHours?: number;
      tags?: string[];
      assignee?: string;
      dependencies?: string[];
    } = {}
  ): Promise<Task> {
    const task: Task = {
      id: this.generateId(),
      title,
      description: options.description || '',
      status: 'pending',
      priority: options.priority || 'medium',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      estimatedHours: options.estimatedHours,
      tags: options.tags || [],
      assignee: options.assignee,
      dependencies: options.dependencies || [],
      progress: 0,
    };

    this.tasks.set(task.id, task);
    await this.saveData();

    return task;
  }

  /**
   * تحديث حالة المهمة
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    task.updatedAt = Date.now();

    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = Date.now();
    } else if (status === 'completed') {
      task.completedAt = Date.now();
      task.progress = 100;

      if (task.startedAt) {
        task.actualHours = (task.completedAt - task.startedAt) / (1000 * 60 * 60);
      }
    }

    await this.saveData();
  }

  /**
   * تحديث تقدم المهمة
   */
  async updateTaskProgress(taskId: string, progress: number): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.progress = Math.max(0, Math.min(100, progress));
    task.updatedAt = Date.now();

    if (task.progress === 100 && task.status !== 'completed') {
      task.status = 'completed';
      task.completedAt = Date.now();
    } else if (task.progress > 0 && task.status === 'pending') {
      task.status = 'in_progress';
      task.startedAt = Date.now();
    }

    await this.saveData();
  }

  /**
   * حذف مهمة
   */
  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
    await this.saveData();
  }

  /**
   * الحصول على مهمة
   */
  getTask(taskId: string | undefined): Task | undefined {
    if (!taskId) return undefined;
    return this.tasks.get(taskId);
  }

  /**
   * الحصول على جميع المهام
   */
  getAllTasks(filter?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    tag?: string;
    assignee?: string;
  }): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      if (filter.status) {
        tasks = tasks.filter((t) => t.status === filter.status);
      }
      if (filter.priority) {
        tasks = tasks.filter((t) => t.priority === filter.priority);
      }
      if (filter.tag) {
        tasks = tasks.filter((t) => filter.tag && t.tags.includes(filter.tag));
      }
      if (filter.assignee) {
        tasks = tasks.filter((t) => t.assignee !== undefined && t.assignee === filter.assignee);
      }
    }

    return tasks;
  }

  /**
   * إنشاء milestone
   */
  async createMilestone(
    name: string,
    options: {
      description?: string;
      dueDate?: number;
      tasks?: string[];
    } = {}
  ): Promise<Milestone> {
    const milestone: Milestone = {
      id: this.generateId(),
      name,
      description: options.description || '',
      dueDate: options.dueDate || Date.now() + 7 * 24 * 60 * 60 * 1000,
      tasks: options.tasks || [],
      completed: false,
      progress: 0,
    };

    this.milestones.set(milestone.id, milestone);
    await this.saveData();

    return milestone;
  }

  /**
   * تحديث milestone
   */
  async updateMilestone(milestoneId: string): Promise<void> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    // حساب التقدم
    const tasks = milestone.tasks
      .map((id) => this.tasks.get(id))
      .filter((t) => t !== undefined) as Task[];

    if (tasks.length > 0) {
      const totalProgress = tasks.reduce((sum, t) => sum + t.progress, 0);
      milestone.progress = Math.round(totalProgress / tasks.length);
      milestone.completed = milestone.progress === 100;
    }

    await this.saveData();
  }

  /**
   * إضافة مهمة إلى milestone
   */
  async addTaskToMilestone(milestoneId: string, taskId: string): Promise<void> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    if (!milestone.tasks.includes(taskId)) {
      milestone.tasks.push(taskId);
      await this.updateMilestone(milestoneId);
    }
  }

  /**
   * حساب الإحصائيات
   */
  calculateStats(): ProjectStats {
    const allTasks = Array.from(this.tasks.values());
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
    const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress').length;
    const blockedTasks = allTasks.filter((t) => t.status === 'blocked').length;

    // معدل الإكمال
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // متوسط وقت المهمة
    const tasksWithTime = allTasks.filter((t) => t.actualHours);
    const averageTaskTime =
      tasksWithTime.length > 0
        ? tasksWithTime.reduce((sum, t) => sum + (t.actualHours || 0), 0) / tasksWithTime.length
        : 0;

    // السرعة (velocity)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const tasksCompletedLastWeek = allTasks.filter(
      (t) => t.completedAt && t.completedAt >= oneWeekAgo
    ).length;

    // تقدير الإكمال
    let estimatedCompletion: number | undefined;
    if (tasksCompletedLastWeek > 0 && inProgressTasks + blockedTasks > 0) {
      const remainingTasks = totalTasks - completedTasks;
      const weeksNeeded = remainingTasks / tasksCompletedLastWeek;
      estimatedCompletion = Date.now() + weeksNeeded * 7 * 24 * 60 * 60 * 1000;
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      completionRate,
      averageTaskTime,
      estimatedCompletion,
      velocity: tasksCompletedLastWeek,
    };
  }

  /**
   * توليد تقرير تقدم
   */
  async generateReport(period?: { from: number; to: number }): Promise<ProgressReport> {
    const now = Date.now();
    const defaultPeriod = {
      from: now - 7 * 24 * 60 * 60 * 1000,
      to: now,
    };

    const reportPeriod = period || defaultPeriod;

    // المهام في الفترة
    const allTasks = Array.from(this.tasks.values());
    const recentTasks = allTasks.filter(
      (t) => t.updatedAt >= reportPeriod.from && t.updatedAt <= reportPeriod.to
    );

    // المهام المعطلة
    const blockers = allTasks.filter((t) => t.status === 'blocked');

    // التوصيات
    const recommendations = this.generateRecommendations(allTasks);

    // تحديث جميع milestones
    for (const milestone of this.milestones.values()) {
      await this.updateMilestone(milestone.id);
    }

    return {
      generatedAt: now,
      period: reportPeriod,
      stats: this.calculateStats(),
      milestones: Array.from(this.milestones.values()),
      recentTasks,
      blockers,
      recommendations,
    };
  }

  /**
   * توليد توصيات
   */
  private generateRecommendations(tasks: Task[]): string[] {
    const recommendations: string[] = [];

    // المهام المعطلة
    const blockedTasks = tasks.filter((t) => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      recommendations.push(`لديك ${blockedTasks.length} مهمة معطلة - حاول حل المعوقات`);
    }

    // المهام ذات الأولوية العالية
    const criticalTasks = tasks.filter(
      (t) => t.priority === 'critical' && t.status !== 'completed'
    );
    if (criticalTasks.length > 0) {
      recommendations.push(`لديك ${criticalTasks.length} مهمة حرجة - ركز عليها`);
    }

    // المهام المتأخرة
    const overdueTasks = tasks.filter(
      (t) => t.estimatedHours && t.actualHours && t.actualHours > t.estimatedHours * 1.5
    );
    if (overdueTasks.length > 0) {
      recommendations.push('بعض المهام تأخذ وقتاً أطول من المتوقع - راجع التقديرات');
    }

    // السرعة المنخفضة
    const stats = this.calculateStats();
    if (stats.velocity < 5) {
      recommendations.push('سرعة الإنجاز منخفضة - حاول تقسيم المهام إلى أجزاء أصغر');
    }

    // معدل الإكمال
    if (stats.completionRate < 50) {
      recommendations.push('معدل الإكمال أقل من 50% - راجع الخطة');
    }

    return recommendations;
  }

  /**
   * تصدير التقرير
   */
  async exportReport(format: 'json' | 'markdown' | 'html', outputPath?: string): Promise<string> {
    const report = await this.generateReport();

    let content = '';

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
    } else if (format === 'markdown') {
      content = this.generateMarkdownReport(report);
    } else if (format === 'html') {
      content = this.generateHTMLReport(report);
    }

    if (outputPath) {
      await fs.writeFile(outputPath, content, 'utf-8');
      return outputPath;
    }

    return content;
  }

  /**
   * توليد تقرير Markdown
   */
  private generateMarkdownReport(report: ProgressReport): string {
    let md = '# تقرير التقدم\n\n';
    md += `**تاريخ التقرير:** ${new Date(report.generatedAt).toLocaleString('ar')}\n\n`;

    // الإحصائيات
    md += '## الإحصائيات\n\n';
    md += `- **إجمالي المهام:** ${report.stats.totalTasks}\n`;
    md += `- **المهام المكتملة:** ${report.stats.completedTasks}\n`;
    md += `- **المهام قيد التنفيذ:** ${report.stats.inProgressTasks}\n`;
    md += `- **المهام المعطلة:** ${report.stats.blockedTasks}\n`;
    md += `- **معدل الإكمال:** ${report.stats.completionRate.toFixed(1)}%\n`;
    md += `- **متوسط وقت المهمة:** ${report.stats.averageTaskTime.toFixed(1)} ساعة\n`;
    md += `- **السرعة:** ${report.stats.velocity} مهمة/أسبوع\n\n`;

    // Milestones
    if (report.milestones.length > 0) {
      md += '## المعالم\n\n';
      for (const milestone of report.milestones) {
        md += `### ${milestone.name}\n`;
        md += `- **التقدم:** ${milestone.progress}%\n`;
        md += `- **الموعد النهائي:** ${new Date(milestone.dueDate).toLocaleDateString('ar')}\n`;
        md += `- **الحالة:** ${milestone.completed ? '✅ مكتمل' : '⏳ قيد العمل'}\n\n`;
      }
    }

    // المهام المعطلة
    if (report.blockers.length > 0) {
      md += '## المهام المعطلة ⚠️\n\n';
      for (const task of report.blockers) {
        md += `- **${task.title}** (${task.priority})\n`;
      }
      md += '\n';
    }

    // التوصيات
    if (report.recommendations.length > 0) {
      md += '## التوصيات 💡\n\n';
      for (const rec of report.recommendations) {
        md += `- ${rec}\n`;
      }
    }

    return md;
  }

  /**
   * توليد تقرير HTML
   */
  private generateHTMLReport(report: ProgressReport): string {
    let html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير التقدم</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1 { color: #007bff; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
    .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
    .milestone { background: #e7f3ff; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .progress-bar { background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; }
    .progress-fill { background: #007bff; height: 100%; transition: width 0.3s; }
    .blocker { background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ffc107; }
    .recommendation { background: #d1ecf1; padding: 10px; margin: 5px 0; border-left: 4px solid #17a2b8; }
  </style>
</head>
<body>
  <h1>تقرير التقدم</h1>
  <p><strong>تاريخ التقرير:</strong> ${new Date(report.generatedAt).toLocaleString('ar')}</p>

  <h2>الإحصائيات</h2>
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${report.stats.totalTasks}</div>
      <div>إجمالي المهام</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.stats.completedTasks}</div>
      <div>مكتملة</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.stats.completionRate.toFixed(1)}%</div>
      <div>معدل الإكمال</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${report.stats.velocity}</div>
      <div>مهمة/أسبوع</div>
    </div>
  </div>

  <h2>المعالم</h2>`;

    for (const milestone of report.milestones) {
      html += `
  <div class="milestone">
    <h3>${milestone.name} ${milestone.completed ? '✅' : ''}</h3>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${milestone.progress}%"></div>
    </div>
    <p>${milestone.progress}% - الموعد: ${new Date(milestone.dueDate).toLocaleDateString('ar')}</p>
  </div>`;
    }

    if (report.blockers.length > 0) {
      html += '<h2>المهام المعطلة ⚠️</h2>';
      for (const blocker of report.blockers) {
        html += `<div class="blocker"><strong>${blocker.title}</strong> (${blocker.priority})</div>`;
      }
    }

    if (report.recommendations.length > 0) {
      html += '<h2>التوصيات 💡</h2>';
      for (const rec of report.recommendations) {
        html += `<div class="recommendation">${rec}</div>`;
      }
    }

    html += `
</body>
</html>`;

    return html;
  }

  /**
   * عرض ملخص
   */
  async showSummary(): Promise<void> {
    const stats = this.calculateStats();

    console.log('\n📊 ملخص التقدم:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 إجمالي المهام: ${stats.totalTasks}`);
    console.log(`✅ المكتملة: ${stats.completedTasks}`);
    console.log(`⏳ قيد التنفيذ: ${stats.inProgressTasks}`);
    console.log(`🚫 معطلة: ${stats.blockedTasks}`);
    console.log(`📈 معدل الإكمال: ${stats.completionRate.toFixed(1)}%`);
    console.log(`⚡ السرعة: ${stats.velocity} مهمة/أسبوع`);

    if (stats.estimatedCompletion) {
      const daysLeft = Math.ceil((stats.estimatedCompletion - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`🎯 الإكمال المتوقع: خلال ${daysLeft} يوم`);
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * حفظ البيانات
   */
  private async saveData(): Promise<void> {
    const data = {
      tasks: Array.from(this.tasks.entries()),
      milestones: Array.from(this.milestones.entries()),
    };

    await fs.writeFile(
      path.join(this.dataPath, 'tracker.json'),
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  /**
   * تحميل البيانات
   */
  private async loadData(): Promise<void> {
    try {
      const content = await fs.readFile(path.join(this.dataPath, 'tracker.json'), 'utf-8');

      const data = JSON.parse(content);
      this.tasks = new Map(data.tasks);
      this.milestones = new Map(data.milestones);
    } catch {
      // الملف غير موجود - بدء جديد
    }
  }
}

/**
 * إنشاء متتبع تقدم
 */
export function createProgressTracker(workingDir: string): ProgressTracker {
  return new ProgressTracker(workingDir);
}
