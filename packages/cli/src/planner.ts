// planner.ts
// ============================================
// 🎯 Intelligent Planning System
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies?: string[]; // task IDs that must complete first
  result?: string;
  error?: string;
}

export interface Plan {
  goal: string;
  tasks: Task[];
  estimatedSteps: number;
}

export class IntelligentPlanner {
  private client: Anthropic;
  private currentPlan?: Plan;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  // ============================================
  // 🎯 إنشاء خطة ذكية
  // ============================================
  async createPlan(userRequest: string, projectContext: string): Promise<Plan> {
    console.log(chalk.cyan('\n🎯 جاري التخطيط...'));

    const planningPrompt = `أنت مخطط ذكي للمهام البرمجية.

المشروع:
${projectContext}

طلب المستخدم:
"${userRequest}"

مهمتك: قسّم هذا الطلب إلى مهام صغيرة قابلة للتنفيذ.

قواعد:
1. كل مهمة يجب أن تكون واضحة ومحددة
2. رتب المهام حسب الأولوية والتبعية
3. اذكر dependencies إذا كانت مهمة تعتمد على أخرى
4. قسّم المهام الكبيرة إلى خطوات صغيرة

أعطني الخطة بالشكل التالي:
TASK 1: [وصف المهمة]
TASK 2: [وصف المهمة] (depends on: 1)
TASK 3: [وصف المهمة]
...`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: planningPrompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const plan = this.parsePlan(userRequest, content.text);
        this.currentPlan = plan;

        // عرض الخطة
        this.displayPlan(plan);

        return plan;
      }
    } catch (error: any) {
      console.log(chalk.red(`خطأ في التخطيط: ${error.message}`));
    }

    // خطة افتراضية إذا فشل التخطيط
    return {
      goal: userRequest,
      tasks: [
        {
          id: '1',
          description: userRequest,
          status: 'pending',
        },
      ],
      estimatedSteps: 1,
    };
  }

  // ============================================
  // 📝 تحليل الخطة من النص
  // ============================================
  private parsePlan(goal: string, planText: string): Plan {
    const tasks: Task[] = [];
    const lines = planText.split('\n');

    for (const line of lines) {
      const taskMatch = line.match(/TASK\s+(\d+):\s*(.+?)(?:\s*\(depends on:\s*([^\)]+)\))?$/i);

      if (taskMatch) {
        const id = taskMatch[1];
        const description = taskMatch[2].trim();
        const dependsOn = taskMatch[3]?.split(',').map((d) => d.trim());

        tasks.push({
          id,
          description,
          status: 'pending',
          dependencies: dependsOn,
        });
      }
    }

    // إذا لم نجد tasks، نستخدم النص كله كمهمة واحدة
    if (tasks.length === 0) {
      tasks.push({
        id: '1',
        description: planText.trim(),
        status: 'pending',
      });
    }

    return {
      goal,
      tasks,
      estimatedSteps: tasks.length,
    };
  }

  // ============================================
  // 🎨 عرض الخطة
  // ============================================
  private displayPlan(plan: Plan): void {
    console.log(chalk.cyan('\n📋 الخطة:'));
    console.log(chalk.gray('━'.repeat(60)));

    for (const task of plan.tasks) {
      const deps = task.dependencies?.length
        ? chalk.gray(` (depends on: ${task.dependencies.join(', ')})`)
        : '';

      console.log(chalk.blue(`  ${task.id}.`) + ` ${task.description}${deps}`);
    }

    console.log(chalk.gray('━'.repeat(60)));
    console.log(chalk.yellow(`📊 إجمالي المهام: ${plan.tasks.length}\n`));
  }

  // ============================================
  // ✅ تحديث حالة مهمة
  // ============================================
  updateTaskStatus(taskId: string, status: Task['status'], result?: string, error?: string): void {
    if (!this.currentPlan) return;

    const task = this.currentPlan.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = status;
      if (result) task.result = result;
      if (error) task.error = error;

      // عرض التحديث
      const statusEmoji = {
        pending: '⏳',
        in_progress: '🔄',
        completed: '✅',
        failed: '❌',
      }[status];

      console.log(chalk.gray(`${statusEmoji} Task ${taskId}: ${status}`));
    }
  }

  // ============================================
  // 🎯 الحصول على المهمة التالية
  // ============================================
  getNextTask(): Task | null {
    if (!this.currentPlan) return null;

    for (const task of this.currentPlan.tasks) {
      // تخطى المهام المكتملة أو الفاشلة
      if (task.status === 'completed' || task.status === 'failed') {
        continue;
      }

      // تخطى المهام قيد التنفيذ
      if (task.status === 'in_progress') {
        continue;
      }

      // تحقق من التبعيات
      if (task.dependencies && task.dependencies.length > 0) {
        const allDependenciesMet = task.dependencies.every((depId) => {
          const depTask = this.currentPlan!.tasks.find((t) => t.id === depId);
          return depTask?.status === 'completed';
        });

        if (!allDependenciesMet) {
          continue; // Dependencies not met yet
        }
      }

      // هذه المهمة جاهزة للتنفيذ
      return task;
    }

    return null; // لا توجد مهام متبقية
  }

  // ============================================
  // 📊 حالة الخطة
  // ============================================
  getPlanStatus(): {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
    progress: number;
  } | null {
    if (!this.currentPlan) return null;

    const total = this.currentPlan.tasks.length;
    const completed = this.currentPlan.tasks.filter((t) => t.status === 'completed').length;
    const failed = this.currentPlan.tasks.filter((t) => t.status === 'failed').length;
    const remaining = total - completed - failed;
    const progress = Math.round((completed / total) * 100);

    return { total, completed, failed, remaining, progress };
  }

  // ============================================
  // 🔄 إعادة التخطيط (في حالة فشل)
  // ============================================
  async replan(failedTask: Task, error: string): Promise<Plan | null> {
    if (!this.currentPlan) return null;

    console.log(chalk.yellow(`\n⚠️ فشلت المهمة ${failedTask.id}, إعادة التخطيط...`));

    const replanPrompt = `المهمة الأصلية: "${this.currentPlan.goal}"

المهمة الفاشلة: "${failedTask.description}"
الخطأ: ${error}

الخطة الأصلية:
${this.currentPlan.tasks.map((t) => `${t.id}. ${t.description} [${t.status}]`).join('\n')}

أعطني خطة بديلة لحل المشكلة:
TASK 1: ...
TASK 2: ...`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: replanPrompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const newPlan = this.parsePlan(this.currentPlan.goal, content.text);
        this.currentPlan = newPlan;
        this.displayPlan(newPlan);
        return newPlan;
      }
    } catch (error: any) {
      console.log(chalk.red(`فشل في إعادة التخطيط: ${error.message}`));
    }

    return null;
  }

  // ============================================
  // 📊 ملخص الخطة
  // ============================================
  getSummary(): string {
    if (!this.currentPlan) return 'لا توجد خطة حالية';

    const status = this.getPlanStatus();
    if (!status) return 'لا توجد خطة حالية';

    let summary = `\n📊 ملخص الخطة:\n`;
    summary += `الهدف: ${this.currentPlan.goal}\n`;
    summary += `التقدم: ${status.completed}/${status.total} (${status.progress}%)\n`;

    if (status.failed > 0) {
      summary += `فاشلة: ${status.failed}\n`;
    }

    return summary;
  }
}
