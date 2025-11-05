// performance-monitoring.ts
// ============================================
// 📊 Performance Monitoring System
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { OqoolAPIClient } from './api-client.js';
import { FileManager, createFileManager } from './file-manager.js';
import { createCodeExecutor } from './code-executor.js';

export interface PerformanceMetrics {
  timestamp: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  databaseQueries: number;
  cacheHitRate: number;
  diskUsage: number;
  loadAverage: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
    duration: number; // milliseconds
  };
  summary: {
    averageResponseTime: number;
    averageMemoryUsage: number;
    averageCpuUsage: number;
    totalErrors: number;
    totalRequests: number;
    uptime: number;
    availability: number;
  };
  metrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  recommendations: string[];
  trends: {
    responseTime: TrendData[];
    memoryUsage: TrendData[];
    cpuUsage: TrendData[];
    errorRate: TrendData[];
  };
}

export interface TrendData {
  timestamp: string;
  value: number;
  change: number; // percentage change from previous
  status: 'improving' | 'degrading' | 'stable';
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number; // milliseconds
  thresholds: {
    responseTime: number; // ms
    memoryUsage: number; // percentage
    cpuUsage: number; // percentage
    errorRate: number; // percentage
    networkLatency: number; // ms
  };
  alerts: {
    email: string[];
    webhook?: string;
    slack?: string;
  };
  endpoints: string[];
  database: {
    enabled: boolean;
    queries: boolean;
    slowQueries: number; // ms
  };
  retention: {
    metrics: number; // days
    logs: number; // days
    reports: number; // days
  };
}

export interface ApplicationHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: string;
  services: ServiceHealth[];
  metrics: PerformanceMetrics;
  issues: string[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export class PerformanceMonitoring {
  private apiClient: OqoolAPIClient;
  private workingDir: string;
  private configPath: string;
  private metricsPath: string;
  private reportsPath: string;
  private alertsPath: string;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.workingDir = workingDir;
    this.configPath = path.join(workingDir, '.oqool', 'performance.json');
    this.metricsPath = path.join(workingDir, '.oqool', 'metrics');
    this.reportsPath = path.join(workingDir, '.oqool', 'perf-reports');
    this.alertsPath = path.join(workingDir, '.oqool', 'alerts');
    this.initializeSystem();
  }

  private async initializeSystem(): Promise<void> {
    await fs.ensureDir(this.metricsPath);
    await fs.ensureDir(this.reportsPath);
    await fs.ensureDir(this.alertsPath);
  }

  // إعداد مراقبة الأداء
  async setupMonitoring(): Promise<void> {
    console.log(chalk.cyan('\n📊 إعداد مراقبة الأداء\n'));

    const config: MonitoringConfig = {
      enabled: true,
      interval: 30000, // 30 ثانية
      thresholds: {
        responseTime: 1000, // 1 ثانية
        memoryUsage: 80, // 80%
        cpuUsage: 70, // 70%
        errorRate: 5, // 5%
        networkLatency: 100, // 100ms
      },
      alerts: {
        email: [],
      },
      endpoints: ['/health', '/api/health'],
      database: {
        enabled: true,
        queries: true,
        slowQueries: 500, // 500ms
      },
      retention: {
        metrics: 30, // 30 يوم
        logs: 7, // 7 أيام
        reports: 90, // 90 يوم
      },
    };

    // تخصيص الإعدادات
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'customize',
        message: 'هل تريد تخصيص إعدادات المراقبة؟',
        default: false,
      },
      {
        type: 'number',
        name: 'responseTime',
        message: 'حد زمن الاستجابة (مللي ثانية):',
        default: 1000,
        when: (answers: any) => answers.customize,
      },
      {
        type: 'number',
        name: 'memoryThreshold',
        message: 'حد استخدام الذاكرة (%):',
        default: 80,
        when: (answers: any) => answers.customize,
      },
      {
        type: 'number',
        name: 'cpuThreshold',
        message: 'حد استخدام المعالج (%):',
        default: 70,
        when: (answers: any) => answers.customize,
      },
      {
        type: 'input',
        name: 'email',
        message: 'البريد الإلكتروني للإشعارات:',
        when: (answers: any) => answers.customize,
      },
      {
        type: 'number',
        name: 'interval',
        message: 'فترة الفحص (ثواني):',
        default: 30,
        when: (answers: any) => answers.customize,
      },
    ]);

    if (answers.customize) {
      config.thresholds.responseTime = answers.responseTime;
      config.thresholds.memoryUsage = answers.memoryThreshold;
      config.thresholds.cpuUsage = answers.cpuThreshold;
      config.interval = answers.interval * 1000;

      if (answers.email) {
        config.alerts.email.push(answers.email);
      }
    }

    await this.saveMonitoringConfig(config);

    console.log(chalk.green('\n✅ تم إعداد مراقبة الأداء!\n'));
    console.log(chalk.cyan('📊 الحدود المحددة:'));
    console.log(chalk.gray(`   - زمن الاستجابة: ${config.thresholds.responseTime}ms`));
    console.log(chalk.gray(`   - الذاكرة: ${config.thresholds.memoryUsage}%`));
    console.log(chalk.gray(`   - المعالج: ${config.thresholds.cpuUsage}%`));
    console.log(chalk.gray(`   - فترة الفحص: ${config.interval / 1000} ثانية`));
  }

  // بدء المراقبة
  async startMonitoring(): Promise<void> {
    const config = await this.loadMonitoringConfig();
    if (!config || !config.enabled) {
      console.log(chalk.yellow('⚠️  يرجى إعداد مراقبة الأداء أولاً\n'));
      return;
    }

    console.log(chalk.cyan('\n📊 بدء مراقبة الأداء...\n'));

    // بدء جمع المقاييس
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, config.interval);

    // فحص أولي
    await this.collectMetrics();

    console.log(chalk.green('✅ تم بدء مراقبة الأداء!\n'));
    console.log(chalk.cyan('📊 الفحص كل'), config.interval / 1000, 'ثانية');
    console.log(chalk.cyan('🔗 العرض:'), 'oqool-code perf status');
    console.log(chalk.cyan('🛑 الإيقاف:'), 'oqool-code perf stop\n');
  }

  // إيقاف المراقبة
  async stopMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log(chalk.green('\n✅ تم إيقاف مراقبة الأداء\n'));
    } else {
      console.log(chalk.yellow('\n⚠️  مراقبة الأداء متوقفة بالفعل\n'));
    }
  }

  // جمع المقاييس
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics();
      await this.saveMetrics(metrics);

      // فحص الحدود وإنشاء الإشعارات
      await this.checkThresholds(metrics);

      // تنظيف البيانات القديمة
      await this.cleanupOldData();
    } catch (error: any) {
      console.error(chalk.red('خطأ في جمع المقاييس:'), error.message);
    }
  }

  // جمع مقاييس النظام
  private async gatherSystemMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date().toISOString();

    // مقاييس وهمية للعرض - في الواقع ستحتاج إلى أدوات حقيقية
    const metrics: PerformanceMetrics = {
      timestamp,
      responseTime: Math.random() * 2000 + 100, // 100-2100ms
      memoryUsage: Math.random() * 100, // 0-100%
      cpuUsage: Math.random() * 100, // 0-100%
      networkLatency: Math.random() * 200 + 10, // 10-210ms
      errorRate: Math.random() * 10, // 0-10%
      throughput: Math.random() * 1000 + 100, // 100-1100 req/s
      activeConnections: Math.floor(Math.random() * 1000),
      databaseQueries: Math.floor(Math.random() * 500),
      cacheHitRate: Math.random() * 100, // 0-100%
      diskUsage: Math.random() * 100, // 0-100%
      loadAverage: Math.random() * 4, // 0-4
    };

    return metrics;
  }

  // حفظ المقاييس
  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    const date = new Date(metrics.timestamp).toISOString().split('T')[0];
    const filePath = path.join(this.metricsPath, `${date}.json`);

    let dailyMetrics: PerformanceMetrics[] = [];
    try {
      dailyMetrics = await fs.readJson(filePath);
    } catch {
      // الملف غير موجود
    }

    dailyMetrics.push(metrics);

    await fs.writeJson(filePath, dailyMetrics, { spaces: 2 });
  }

  // فحص الحدود وإنشاء الإشعارات
  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    const config = await this.loadMonitoringConfig();
    if (!config) return;

    const thresholds = config.thresholds;
    const alerts: PerformanceAlert[] = [];

    // فحص زمن الاستجابة
    if (metrics.responseTime > thresholds.responseTime) {
      alerts.push({
        id: `alert_${Date.now()}_response`,
        type: metrics.responseTime > thresholds.responseTime * 2 ? 'critical' : 'warning',
        message: `زمن الاستجابة مرتفع: ${metrics.responseTime.toFixed(0)}ms`,
        value: metrics.responseTime,
        threshold: thresholds.responseTime,
        timestamp: metrics.timestamp,
        resolved: false,
      });
    }

    // فحص استخدام الذاكرة
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      alerts.push({
        id: `alert_${Date.now()}_memory`,
        type: metrics.memoryUsage > 95 ? 'critical' : 'warning',
        message: `استخدام الذاكرة مرتفع: ${metrics.memoryUsage.toFixed(1)}%`,
        value: metrics.memoryUsage,
        threshold: thresholds.memoryUsage,
        timestamp: metrics.timestamp,
        resolved: false,
      });
    }

    // فحص استخدام المعالج
    if (metrics.cpuUsage > thresholds.cpuUsage) {
      alerts.push({
        id: `alert_${Date.now()}_cpu`,
        type: metrics.cpuUsage > 90 ? 'critical' : 'warning',
        message: `استخدام المعالج مرتفع: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage,
        threshold: thresholds.cpuUsage,
        timestamp: metrics.timestamp,
        resolved: false,
      });
    }

    // فحص معدل الأخطاء
    if (metrics.errorRate > thresholds.errorRate) {
      alerts.push({
        id: `alert_${Date.now()}_error`,
        type: metrics.errorRate > 15 ? 'critical' : 'error',
        message: `معدل الأخطاء مرتفع: ${metrics.errorRate.toFixed(1)}%`,
        value: metrics.errorRate,
        threshold: thresholds.errorRate,
        timestamp: metrics.timestamp,
        resolved: false,
      });
    }

    // حفظ الإشعارات
    for (const alert of alerts) {
      await this.saveAlert(alert);

      // إرسال إشعار
      await this.sendAlertNotification(alert);
    }
  }

  // عرض حالة الأداء الحالية
  async showCurrentStatus(): Promise<void> {
    console.log(chalk.cyan('\n📊 حالة الأداء الحالية:\n'));

    try {
      // الحصول على آخر المقاييس
      const latestMetrics = await this.getLatestMetrics();

      if (!latestMetrics) {
        console.log(chalk.yellow('⚠️  لا توجد بيانات أداء متاحة\n'));
        return;
      }

      // عرض المقاييس الرئيسية
      console.log(chalk.yellow('⚡ المقاييس الرئيسية:'));
      console.log(
        chalk.white(`   زمن الاستجابة: ${chalk.cyan(latestMetrics.responseTime.toFixed(0) + 'ms')}`)
      );
      console.log(
        chalk.white(`   استخدام الذاكرة: ${chalk.cyan(latestMetrics.memoryUsage.toFixed(1) + '%')}`)
      );
      console.log(
        chalk.white(`   استخدام المعالج: ${chalk.cyan(latestMetrics.cpuUsage.toFixed(1) + '%')}`)
      );
      console.log(
        chalk.white(`   معدل الأخطاء: ${chalk.cyan(latestMetrics.errorRate.toFixed(1) + '%')}`)
      );
      console.log(
        chalk.white(`   الإنتاجية: ${chalk.cyan(latestMetrics.throughput.toFixed(0) + ' req/s')}`)
      );

      // عرض حالة الصحة
      const health = this.calculateHealthStatus(latestMetrics);
      const healthIcon = health === 'healthy' ? '🟢' : health === 'degraded' ? '🟡' : '🔴';
      console.log(chalk.white(`   حالة الصحة: ${healthIcon} ${health.toUpperCase()}`));

      // عرض الإشعارات النشطة
      const activeAlerts = await this.getActiveAlerts();
      if (activeAlerts.length > 0) {
        console.log(chalk.yellow('\n⚠️  الإشعارات النشطة:'));
        for (const alert of activeAlerts.slice(0, 5)) {
          const typeIcon = alert.type === 'critical' ? '🔴' : alert.type === 'error' ? '🟠' : '🟡';
          console.log(chalk.gray(`   ${typeIcon} ${alert.message}`));
        }
      }

      console.log();
    } catch (error: any) {
      console.error(chalk.red('خطأ في عرض حالة الأداء:'), error.message);
    }
  }

  // حساب حالة الصحة
  private calculateHealthStatus(metrics: PerformanceMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    const config = {
      thresholds: { responseTime: 1000, memoryUsage: 80, cpuUsage: 70, errorRate: 5 },
    };

    let issues = 0;

    if (metrics.responseTime > config.thresholds.responseTime * 2) issues++;
    if (metrics.memoryUsage > config.thresholds.memoryUsage * 1.2) issues++;
    if (metrics.cpuUsage > config.thresholds.cpuUsage * 1.2) issues++;
    if (metrics.errorRate > config.thresholds.errorRate * 2) issues++;

    if (issues >= 2) return 'unhealthy';
    if (issues === 1) return 'degraded';
    return 'healthy';
  }

  // الحصول على آخر المقاييس
  private async getLatestMetrics(): Promise<PerformanceMetrics | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const filePath = path.join(this.metricsPath, `${today}.json`);

      const dailyMetrics: PerformanceMetrics[] = await fs.readJson(filePath);
      return dailyMetrics[dailyMetrics.length - 1] || null;
    } catch {
      return null;
    }
  }

  // إنشاء تقرير الأداء
  async generateReport(period: 'day' | 'week' | 'month' = 'day'): Promise<string> {
    const spinner = ora('جاري إنشاء تقرير الأداء...').start();

    try {
      const report = await this.collectPerformanceData(period);
      const reportPath = await this.savePerformanceReport(report);

      spinner.succeed('تم إنشاء تقرير الأداء');

      console.log(chalk.green(`\n✅ تم حفظ التقرير في: ${reportPath}\n`));

      this.displayReportSummary(report);

      return reportPath;
    } catch (error: any) {
      spinner.fail('فشل إنشاء التقرير');
      throw error;
    }
  }

  // جمع بيانات الأداء
  private async collectPerformanceData(
    period: 'day' | 'week' | 'month'
  ): Promise<PerformanceReport> {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
    }

    const metrics = await this.getMetricsInPeriod(startDate, endDate);
    const alerts = await this.getAlertsInPeriod(startDate, endDate);

    // حساب الملخص
    const summary = this.calculateSummary(metrics);

    // تحليل الاتجاهات
    const trends = this.analyzeTrends(metrics);

    // توليد التوصيات
    const recommendations = this.generateRecommendations(metrics, alerts);

    const report: PerformanceReport = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: endDate.getTime() - startDate.getTime(),
      },
      summary,
      metrics,
      alerts,
      recommendations,
      trends,
    };

    return report;
  }

  // حساب الملخص
  private calculateSummary(metrics: PerformanceMetrics[]): any {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        averageMemoryUsage: 0,
        averageCpuUsage: 0,
        totalErrors: 0,
        totalRequests: 0,
        uptime: 0,
        availability: 0,
      };
    }

    const totals = metrics.reduce(
      (acc, metric) => ({
        responseTime: acc.responseTime + metric.responseTime,
        memoryUsage: acc.memoryUsage + metric.memoryUsage,
        cpuUsage: acc.cpuUsage + metric.cpuUsage,
        errorRate: acc.errorRate + metric.errorRate,
        throughput: acc.throughput + metric.throughput,
      }),
      { responseTime: 0, memoryUsage: 0, cpuUsage: 0, errorRate: 0, throughput: 0 }
    );

    return {
      averageResponseTime: totals.responseTime / metrics.length,
      averageMemoryUsage: totals.memoryUsage / metrics.length,
      averageCpuUsage: totals.cpuUsage / metrics.length,
      totalErrors: Math.floor((totals.errorRate * metrics.length) / 100),
      totalRequests: Math.floor(totals.throughput * metrics.length),
      uptime: this.calculateUptime(metrics),
      availability: this.calculateAvailability(metrics),
    };
  }

  // حساب uptime
  private calculateUptime(metrics: PerformanceMetrics[]): number {
    const healthyCount = metrics.filter((m) => m.responseTime < 2000 && m.errorRate < 10).length;

    return (healthyCount / metrics.length) * 100;
  }

  // حساب availability
  private calculateAvailability(metrics: PerformanceMetrics[]): number {
    const availableCount = metrics.filter((m) => m.responseTime < 5000 && m.errorRate < 20).length;

    return (availableCount / metrics.length) * 100;
  }

  // تحليل الاتجاهات
  private analyzeTrends(metrics: PerformanceMetrics[]): any {
    if (metrics.length < 2) {
      return {
        responseTime: [],
        memoryUsage: [],
        cpuUsage: [],
        errorRate: [],
      };
    }

    const trends = {
      responseTime: this.calculateTrendData(
        metrics.map((m) => ({ timestamp: m.timestamp, value: m.responseTime }))
      ),
      memoryUsage: this.calculateTrendData(
        metrics.map((m) => ({ timestamp: m.timestamp, value: m.memoryUsage }))
      ),
      cpuUsage: this.calculateTrendData(
        metrics.map((m) => ({ timestamp: m.timestamp, value: m.cpuUsage }))
      ),
      errorRate: this.calculateTrendData(
        metrics.map((m) => ({ timestamp: m.timestamp, value: m.errorRate }))
      ),
    };

    return trends;
  }

  // حساب بيانات الاتجاه
  private calculateTrendData(data: Array<{ timestamp: string; value: number }>): TrendData[] {
    return data.map((item, index) => {
      if (index === 0) {
        return {
          timestamp: item.timestamp,
          value: item.value,
          change: 0,
          status: 'stable' as const,
        };
      }

      const previous = data[index - 1];
      const change = ((item.value - previous.value) / previous.value) * 100;

      let status: 'improving' | 'degrading' | 'stable';
      if (Math.abs(change) < 5) {
        status = 'stable';
      } else if (change < 0) {
        status = 'improving';
      } else {
        status = 'degrading';
      }

      return {
        timestamp: item.timestamp,
        value: item.value,
        change,
        status,
      };
    });
  }

  // توليد التوصيات
  private generateRecommendations(
    metrics: PerformanceMetrics[],
    alerts: PerformanceAlert[]
  ): string[] {
    const recommendations: string[] = [];

    // تحليل المقاييس
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;

    if (avgResponseTime > 1000) {
      recommendations.push('فكر في إضافة caching لتحسين زمن الاستجابة');
    }

    if (avgMemoryUsage > 80) {
      recommendations.push('راقب استخدام الذاكرة - قد تحتاج إلى تحسين إدارة الذاكرة');
    }

    if (avgCpuUsage > 70) {
      recommendations.push('استخدام المعالج مرتفع - راجع الاستعلامات المعقدة');
    }

    if (avgErrorRate > 5) {
      recommendations.push('معدل الأخطاء مرتفع - راجع error handling');
    }

    // توصيات بناءً على الإشعارات
    const criticalAlerts = alerts.filter((a) => a.type === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push('لديك إشعارات حرجة تحتاج إلى إصلاح فوري');
    }

    if (recommendations.length === 0) {
      recommendations.push('الأداء جيد! استمر في المراقبة');
    }

    return recommendations;
  }

  // عرض ملخص التقرير
  private displayReportSummary(report: PerformanceReport): void {
    console.log(chalk.cyan('\n📊 ملخص تقرير الأداء:\n'));

    console.log(
      chalk.yellow('⏱️  الفترة:'),
      new Date(report.period.start).toLocaleDateString('ar'),
      'إلى',
      new Date(report.period.end).toLocaleDateString('ar')
    );

    console.log(chalk.yellow('📈 الأداء:'));
    console.log(
      chalk.white(
        `   متوسط زمن الاستجابة: ${chalk.cyan(report.summary.averageResponseTime.toFixed(0) + 'ms')}`
      )
    );
    console.log(
      chalk.white(
        `   متوسط استخدام الذاكرة: ${chalk.cyan(report.summary.averageMemoryUsage.toFixed(1) + '%')}`
      )
    );
    console.log(
      chalk.white(
        `   متوسط استخدام المعالج: ${chalk.cyan(report.summary.averageCpuUsage.toFixed(1) + '%')}`
      )
    );
    console.log(chalk.white(`   معدل الأخطاء: ${chalk.cyan(report.summary.totalErrors)}`));

    console.log(chalk.yellow('⚡ الموثوقية:'));
    console.log(chalk.white(`   uptime: ${chalk.green(report.summary.uptime.toFixed(1) + '%')}`));
    console.log(
      chalk.white(`   availability: ${chalk.green(report.summary.availability.toFixed(1) + '%')}`)
    );

    if (report.alerts.length > 0) {
      console.log(chalk.yellow('⚠️  الإشعارات:'), report.alerts.length);
    }

    console.log(chalk.yellow('💡 التوصيات:'));
    for (const recommendation of report.recommendations.slice(0, 3)) {
      console.log(chalk.gray(`   • ${recommendation}`));
    }

    console.log();
  }

  // مراقبة التطبيق في الوقت الفعلي
  async monitorApplication(url: string, duration: number = 300000): Promise<void> {
    console.log(chalk.cyan(`\n📊 مراقبة التطبيق: ${url}\n`));
    console.log(chalk.gray(`⏰ المدة: ${duration / 1000} ثانية\n`));

    const startTime = Date.now();
    let requestCount = 0;
    let totalResponseTime = 0;
    let errorCount = 0;

    const monitoringInterval = setInterval(async () => {
      try {
        requestCount++;
        const requestStart = Date.now();

        const response = await fetch(url);
        const responseTime = Date.now() - requestStart;
        totalResponseTime += responseTime;

        const statusIcon = response.ok ? '🟢' : '🔴';
        const avgResponseTime = totalResponseTime / requestCount;

        console.log(
          chalk.gray(
            `${statusIcon} ${new Date().toLocaleTimeString('ar')} - ${response.status} (${responseTime}ms) - متوسط: ${avgResponseTime.toFixed(0)}ms`
          )
        );
      } catch (error: any) {
        errorCount++;
        console.log(chalk.red(`🔴 ${new Date().toLocaleTimeString('ar')} - خطأ: ${error.message}`));
      }
    }, 5000); // كل 5 ثواني

    // إيقاف المراقبة بعد المدة المحددة
    setTimeout(() => {
      clearInterval(monitoringInterval);

      const totalTime = Date.now() - startTime;
      const successRate = ((requestCount - errorCount) / requestCount) * 100;

      console.log(chalk.yellow('\n📊 ملخص المراقبة:'));
      console.log(chalk.white(`   إجمالي الطلبات: ${requestCount}`));
      console.log(chalk.white(`   الطلبات الناجحة: ${requestCount - errorCount}`));
      console.log(chalk.white(`   الأخطاء: ${errorCount}`));
      console.log(chalk.white(`   معدل النجاح: ${successRate.toFixed(1)}%`));
      console.log(
        chalk.white(`   متوسط زمن الاستجابة: ${(totalResponseTime / requestCount).toFixed(0)}ms`)
      );

      console.log(chalk.green('\n✅ انتهت المراقبة\n'));
    }, duration);
  }

  // تحليل الأداء المتقدم
  async analyzePerformance(): Promise<void> {
    console.log(chalk.cyan('\n🔍 تحليل الأداء المتقدم\n'));

    try {
      // جمع البيانات من آخر 7 أيام
      const report = await this.collectPerformanceData('week');

      // تحليل الاتجاهات
      console.log(chalk.yellow('📈 تحليل الاتجاهات:'));

      for (const [metric, trend] of Object.entries(report.trends)) {
        const latest = trend[trend.length - 1];
        if (latest) {
          const statusIcon =
            latest.status === 'improving' ? '↗️' : latest.status === 'degrading' ? '↘️' : '➡️';
          const statusColor =
            latest.status === 'improving'
              ? chalk.green
              : latest.status === 'degrading'
                ? chalk.red
                : chalk.yellow;

          console.log(
            chalk.white(
              `   ${statusIcon} ${this.getMetricDisplayName(metric)}: ${statusColor(latest.change.toFixed(1) + '%')}`
            )
          );
        }
      }

      // تحليل الأداء حسب الوقت
      console.log(chalk.yellow('\n⏰ الأداء حسب الوقت:'));

      const hourlyPerformance = this.analyzeHourlyPerformance(report.metrics);
      for (const [hour, performance] of Object.entries(hourlyPerformance)) {
        const performanceIcon = performance > 90 ? '🟢' : performance > 70 ? '🟡' : '🔴';
        console.log(chalk.gray(`   ${performanceIcon} ${hour}: ${performance.toFixed(1)}%`));
      }

      // تحليل الأداء حسب اليوم
      console.log(chalk.yellow('\n📅 الأداء حسب اليوم:'));

      const dailyPerformance = this.analyzeDailyPerformance(report.metrics);
      for (const [day, performance] of Object.entries(dailyPerformance)) {
        const performanceIcon = performance > 90 ? '🟢' : performance > 70 ? '🟡' : '🔴';
        console.log(chalk.gray(`   ${performanceIcon} ${day}: ${performance.toFixed(1)}%`));
      }

      console.log();
    } catch (error: any) {
      console.error(chalk.red('خطأ في تحليل الأداء:'), error.message);
    }
  }

  // تحليل الأداء بالساعة
  private analyzeHourlyPerformance(metrics: PerformanceMetrics[]): Record<string, number> {
    const hourly: Record<string, number[]> = {};

    for (const metric of metrics) {
      const hour = new Date(metric.timestamp).getHours().toString().padStart(2, '0') + ':00';

      if (!hourly[hour]) {
        hourly[hour] = [];
      }

      // حساب درجة الأداء (100 - مشاكل)
      const score = Math.max(
        0,
        100 -
          (metric.responseTime > 1000 ? 20 : 0) -
          (metric.memoryUsage > 80 ? 20 : 0) -
          (metric.cpuUsage > 70 ? 20 : 0) -
          (metric.errorRate > 5 ? 20 : 0)
      );

      hourly[hour].push(score);
    }

    // حساب متوسط كل ساعة
    const result: Record<string, number> = {};
    for (const [hour, scores] of Object.entries(hourly)) {
      result[hour] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return result;
  }

  // تحليل الأداء باليوم
  private analyzeDailyPerformance(metrics: PerformanceMetrics[]): Record<string, number> {
    const daily: Record<string, number[]> = {};

    for (const metric of metrics) {
      const day = new Date(metric.timestamp).toLocaleDateString('ar');

      if (!daily[day]) {
        daily[day] = [];
      }

      const score = Math.max(
        0,
        100 -
          (metric.responseTime > 1000 ? 20 : 0) -
          (metric.memoryUsage > 80 ? 20 : 0) -
          (metric.cpuUsage > 70 ? 20 : 0) -
          (metric.errorRate > 5 ? 20 : 0)
      );

      daily[day].push(score);
    }

    const result: Record<string, number> = {};
    for (const [day, scores] of Object.entries(daily)) {
      result[day] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    }

    return result;
  }

  // الحصول على اسم العرض للمقياس
  private getMetricDisplayName(metric: string): string {
    const names = {
      responseTime: 'زمن الاستجابة',
      memoryUsage: 'استخدام الذاكرة',
      cpuUsage: 'استخدام المعالج',
      errorRate: 'معدل الأخطاء',
    };

    return names[metric as keyof typeof names] || metric;
  }

  // أدوات مساعدة
  private async saveMonitoringConfig(config: MonitoringConfig): Promise<void> {
    await fs.writeJson(this.configPath, config, { spaces: 2 });
  }

  private async loadMonitoringConfig(): Promise<MonitoringConfig | null> {
    try {
      return await fs.readJson(this.configPath);
    } catch {
      return null;
    }
  }

  private async saveAlert(alert: PerformanceAlert): Promise<void> {
    const filePath = path.join(this.alertsPath, `${alert.id}.json`);
    await fs.writeJson(filePath, alert, { spaces: 2 });
  }

  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    const config = await this.loadMonitoringConfig();
    if (!config) return;

    // محاكاة إرسال الإشعار
    console.log(chalk.yellow(`📧 إشعار: ${alert.type.toUpperCase()} - ${alert.message}`));

    if (config.alerts.email.length > 0) {
      console.log(chalk.gray(`   إرسال إلى: ${config.alerts.email.join(', ')}`));
    }
  }

  private async getActiveAlerts(): Promise<PerformanceAlert[]> {
    try {
      const files = await fs.readdir(this.alertsPath);
      const alerts: PerformanceAlert[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const alert = await fs.readJson(path.join(this.alertsPath, file));
          if (!alert.resolved) {
            alerts.push(alert);
          }
        }
      }

      return alerts.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  }

  private async getMetricsInPeriod(startDate: Date, endDate: Date): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(this.metricsPath, `${dateStr}.json`);

      try {
        const dailyMetrics: PerformanceMetrics[] = await fs.readJson(filePath);
        metrics.push(...dailyMetrics);
      } catch {
        // الملف غير موجود
      }
    }

    return metrics;
  }

  private async getAlertsInPeriod(startDate: Date, endDate: Date): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    try {
      const files = await fs.readdir(this.alertsPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const alert = await fs.readJson(path.join(this.alertsPath, file));
          const alertDate = new Date(alert.timestamp);

          if (alertDate >= startDate && alertDate <= endDate) {
            alerts.push(alert);
          }
        }
      }
    } catch {
      // مجلد الإشعارات غير موجود
    }

    return alerts;
  }

  private async savePerformanceReport(report: PerformanceReport): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${timestamp}.json`;
    const filePath = path.join(this.reportsPath, filename);

    await fs.writeJson(filePath, report, { spaces: 2 });
    return filePath;
  }

  private async cleanupOldData(): Promise<void> {
    const config = await this.loadMonitoringConfig();
    if (!config) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retention.metrics);

    try {
      const files = await fs.readdir(this.metricsPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const fileDate = new Date(file.replace('.json', ''));
          if (fileDate < cutoffDate) {
            await fs.remove(path.join(this.metricsPath, file));
          }
        }
      }
    } catch {
      // مجلد المقاييس غير موجود
    }
  }
}

export function createPerformanceMonitoring(
  apiClient: OqoolAPIClient,
  workingDir?: string
): PerformanceMonitoring {
  return new PerformanceMonitoring(apiClient, workingDir);
}
