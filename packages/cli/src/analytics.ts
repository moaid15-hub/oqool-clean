// analytics.ts
// ============================================
// 📊 Analytics - تحليلات الاستخدام
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface UsageLog {
  command: string;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface AnalyticsData {
  totalCommands: number;
  commandCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  averageDuration: Record<string, number>;
  totalTimeSaved: number;
  firstUsed: number;
  lastUsed: number;
}

export interface Insights {
  productivity: string;
  mostUsed: string[];
  timesSaved: string;
  errorRate: number;
  recommendations: string[];
}

export class Analytics {
  private dataPath: string;
  private data: AnalyticsData;

  constructor(workingDirectory: string) {
    this.dataPath = path.join(workingDirectory, '.oqool', 'analytics.json');
    this.data = this.loadData();
  }

  // ============================================
  // 📝 تحميل البيانات
  // ============================================
  private loadData(): AnalyticsData {
    try {
      if (fs.existsSync(this.dataPath)) {
        return fs.readJsonSync(this.dataPath);
      }
    } catch (error) {
      // ignore
    }

    return {
      totalCommands: 0,
      commandCounts: {},
      errorCounts: {},
      averageDuration: {},
      totalTimeSaved: 0,
      firstUsed: Date.now(),
      lastUsed: Date.now(),
    };
  }

  // ============================================
  // 💾 حفظ البيانات
  // ============================================
  private async saveData(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.dataPath));
      await fs.writeJson(this.dataPath, this.data, { spaces: 2 });
    } catch (error) {
      // ignore
    }
  }

  // ============================================
  // 📊 تتبع الاستخدام
  // ============================================
  async trackUsage(log: UsageLog): Promise<void> {
    // زيادة العدد الإجمالي
    this.data.totalCommands++;

    // تتبع الأوامر
    this.data.commandCounts[log.command] = (this.data.commandCounts[log.command] || 0) + 1;

    // تتبع الأخطاء
    if (!log.success && log.error) {
      this.data.errorCounts[log.error] = (this.data.errorCounts[log.error] || 0) + 1;
    }

    // حساب متوسط المدة
    const currentAvg = this.data.averageDuration[log.command] || 0;
    const count = this.data.commandCounts[log.command];
    this.data.averageDuration[log.command] = (currentAvg * (count - 1) + log.duration) / count;

    // تقدير الوقت المحفوظ (افتراضياً: كل أمر يوفر 15 دقيقة)
    if (log.success) {
      this.data.totalTimeSaved += 15; // دقائق
    }

    // تحديث التواريخ
    this.data.lastUsed = log.timestamp;

    await this.saveData();
  }

  // ============================================
  // 💡 توليد Insights
  // ============================================
  generateInsights(): Insights {
    const commands = Object.entries(this.data.commandCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cmd]) => cmd);

    const totalErrors = Object.values(this.data.errorCounts).reduce((sum, count) => sum + count, 0);
    const errorRate =
      this.data.totalCommands > 0 ? (totalErrors / this.data.totalCommands) * 100 : 0;

    const hoursSaved = Math.floor(this.data.totalTimeSaved / 60);
    const minutesSaved = this.data.totalTimeSaved % 60;

    // حساب زيادة الإنتاجية
    const daysUsed = Math.max(
      1,
      Math.ceil((Date.now() - this.data.firstUsed) / (1000 * 60 * 60 * 24))
    );
    const commandsPerDay = this.data.totalCommands / daysUsed;
    const productivityIncrease = Math.round(commandsPerDay * 15); // افتراضياً كل أمر = زيادة 15% إنتاجية

    // التوصيات
    const recommendations: string[] = [];

    if (errorRate > 20) {
      recommendations.push('معدل الأخطاء مرتفع - راجع الأوامر المستخدمة');
    }

    if (
      commands.length > 0 &&
      this.data.commandCounts[commands[0]] > this.data.totalCommands * 0.5
    ) {
      recommendations.push(`تستخدم "${commands[0]}" كثيراً - جرب الأوامر الأخرى`);
    }

    if (this.data.totalCommands < 10) {
      recommendations.push('استكشف المزيد من الميزات لزيادة الإنتاجية');
    }

    if (recommendations.length === 0) {
      recommendations.push('أداءك ممتاز! استمر في استخدام oqool');
    }

    return {
      productivity: `زيادة ${productivityIncrease}% في الإنتاجية`,
      mostUsed: commands.slice(0, 5),
      timesSaved: `${hoursSaved} ساعة و ${minutesSaved} دقيقة هذا الشهر`,
      errorRate: Math.round(errorRate * 10) / 10,
      recommendations,
    };
  }

  // ============================================
  // 📈 عرض التحليلات
  // ============================================
  async showAnalytics(): Promise<void> {
    console.log(chalk.cyan('\n📊 تحليلات الاستخدام:\n'));
    console.log(chalk.gray('═'.repeat(60)));

    // الإحصائيات الأساسية
    console.log(
      chalk.white(`\n📈 إجمالي الأوامر: ${chalk.green(this.data.totalCommands.toString())}`)
    );

    const daysSinceFirst = Math.ceil((Date.now() - this.data.firstUsed) / (1000 * 60 * 60 * 24));
    console.log(chalk.white(`⏱️  الاستخدام منذ: ${chalk.yellow(daysSinceFirst + ' يوم')}`));

    // أكثر الأوامر استخداماً
    console.log(chalk.cyan('\n🔝 أكثر الأوامر استخداماً:'));
    const topCommands = Object.entries(this.data.commandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    topCommands.forEach(([cmd, count], i) => {
      const avg = this.data.averageDuration[cmd] || 0;
      console.log(
        chalk.blue(`  ${i + 1}. ${cmd}`) +
          chalk.gray(` - ${count} مرة`) +
          chalk.yellow(` (${Math.round(avg)}ms متوسط)`)
      );
    });

    // الأخطاء الأكثر تكراراً
    const topErrors = Object.entries(this.data.errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topErrors.length > 0) {
      console.log(chalk.red('\n❌ الأخطاء الأكثر تكراراً:'));
      topErrors.forEach(([error, count], i) => {
        console.log(chalk.gray(`  ${i + 1}. ${error.substring(0, 50)}... (${count} مرة)`));
      });
    }

    // Insights
    const insights = this.generateInsights();
    console.log(chalk.cyan('\n💡 Insights:\n'));
    console.log(chalk.green(`✨ ${insights.productivity}`));
    console.log(chalk.green(`⏱️  ${insights.timesSaved}`));
    console.log(chalk.yellow(`📊 معدل الأخطاء: ${insights.errorRate}%`));

    console.log(chalk.cyan('\n📌 التوصيات:'));
    insights.recommendations.forEach((rec) => {
      console.log(chalk.gray(`  • ${rec}`));
    });

    console.log(chalk.gray('\n═'.repeat(60) + '\n'));
  }

  // ============================================
  // 🗑️ إعادة تعيين البيانات
  // ============================================
  async reset(): Promise<void> {
    this.data = {
      totalCommands: 0,
      commandCounts: {},
      errorCounts: {},
      averageDuration: {},
      totalTimeSaved: 0,
      firstUsed: Date.now(),
      lastUsed: Date.now(),
    };

    await this.saveData();
    console.log(chalk.green('\n✅ تم إعادة تعيين التحليلات\n'));
  }

  // ============================================
  // 📤 تصدير البيانات
  // ============================================
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.data, null, 2);
    } else {
      // CSV format
      let csv = 'Command,Count,Avg Duration (ms)\n';
      for (const [cmd, count] of Object.entries(this.data.commandCounts)) {
        const avg = this.data.averageDuration[cmd] || 0;
        csv += `${cmd},${count},${Math.round(avg)}\n`;
      }
      return csv;
    }
  }

  // ============================================
  // 📊 الحصول على البيانات الخام
  // ============================================
  getData(): AnalyticsData {
    return { ...this.data };
  }
}

// ============================================
// 🏭 Factory Function
// ============================================
export function createAnalytics(workingDirectory: string = process.cwd()): Analytics {
  return new Analytics(workingDirectory);
}
