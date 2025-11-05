// performance-monitor.ts
// ============================================
// 📊 Performance Monitoring System
// ============================================

import { EventEmitter } from 'events';
import fs from 'fs-extra';
import { join } from 'path';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceStats {
  cpu: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cache: {
    hitRate: number;
    size: number;
  };
  api: {
    avgResponseTime: number;
    errorRate: number;
  };
  hotspots: Array<{
    name: string;
    avgDuration: number;
    calls: number;
  }>;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: Metric[] = [];
  private timers: Map<string, number> = new Map();
  private workingDirectory: string;
  private saveInterval?: NodeJS.Timeout;

  constructor(workingDirectory: string) {
    super();
    this.workingDirectory = workingDirectory;
  }

  // ============================================
  // 📊 تسجيل Metric
  // ============================================
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);
    this.emit('metric', metric);

    // حفظ كل 100 metric
    if (this.metrics.length >= 100) {
      this.save().catch(() => {});
    }
  }

  // ============================================
  // ⏱️ بدء Timer
  // ============================================
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  // ============================================
  // ⏱️ إيقاف Timer وتسجيل
  // ============================================
  endTimer(name: string): number | null {
    const start = this.timers.get(name);
    if (!start) return null;

    const duration = Date.now() - start;
    this.record(name, duration, { type: 'duration' });
    this.timers.delete(name);

    return duration;
  }

  // ============================================
  // 🎯 Track Function
  // ============================================
  async track<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);

    try {
      const result = await fn();
      this.endTimer(name);
      return result;
    } catch (error) {
      this.endTimer(name);
      this.record(`${name}_error`, 1, { type: 'error' });
      throw error;
    }
  }

  // ============================================
  // 📈 الحصول على الإحصائيات
  // ============================================
  getStats(): PerformanceStats {
    // CPU
    const cpuUsage = process.cpuUsage();
    const cpu = (cpuUsage.user + cpuUsage.system) / 1000000; // to seconds

    // Memory
    const memUsage = process.memoryUsage();
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024),
      total: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    };

    // Cache (من الـ metrics)
    const cacheHits = this.metrics.filter((m) => m.name === 'cache_hit').length;
    const cacheMisses = this.metrics.filter((m) => m.name === 'cache_miss').length;
    const cacheTotal = cacheHits + cacheMisses;
    const cache = {
      hitRate: cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) : 0,
      size: this.metrics.filter((m) => m.name === 'cache_size').slice(-1)[0]?.value || 0,
    };

    // API
    const apiMetrics = this.metrics.filter((m) => m.tags?.type === 'duration');
    const avgResponseTime =
      apiMetrics.length > 0
        ? Math.round(apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length)
        : 0;

    const errorMetrics = this.metrics.filter((m) => m.tags?.type === 'error');
    const errorRate =
      apiMetrics.length > 0 ? Math.round((errorMetrics.length / apiMetrics.length) * 100) : 0;

    const api = {
      avgResponseTime,
      errorRate,
    };

    // Hotspots
    const functionMetrics = new Map<string, { total: number; count: number }>();

    for (const metric of apiMetrics) {
      if (!functionMetrics.has(metric.name)) {
        functionMetrics.set(metric.name, { total: 0, count: 0 });
      }

      const data = functionMetrics.get(metric.name)!;
      data.total += metric.value;
      data.count++;
    }

    const hotspots = Array.from(functionMetrics.entries())
      .map(([name, data]) => ({
        name,
        avgDuration: Math.round(data.total / data.count),
        calls: data.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      cpu,
      memory,
      cache,
      api,
      hotspots,
    };
  }

  // ============================================
  // 💾 حفظ Metrics
  // ============================================
  private async save(): Promise<void> {
    try {
      const dataDir = join(this.workingDirectory, '.oqool', 'metrics');
      await fs.ensureDir(dataDir);

      const filename = `metrics-${Date.now()}.json`;
      const filepath = join(dataDir, filename);

      await fs.writeJSON(filepath, {
        timestamp: Date.now(),
        metrics: this.metrics.slice(-1000), // آخر 1000 metric فقط
      });

      // حذف الـ metrics القديمة من الذاكرة
      this.metrics = this.metrics.slice(-500);
    } catch (error) {
      // تجاهل أخطاء الحفظ
    }
  }

  // ============================================
  // 🚀 بدء المراقبة
  // ============================================
  start(): void {
    // حفظ كل دقيقة
    this.saveInterval = setInterval(() => {
      this.save().catch(() => {});
    }, 60000);

    console.log('📊 Performance Monitor بدأ');
  }

  // ============================================
  // 🛑 إيقاف المراقبة
  // ============================================
  stop(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    // حفظ أخير
    this.save().catch(() => {});

    console.log('📊 Performance Monitor توقف');
  }

  // ============================================
  // 🎨 عرض Dashboard
  // ============================================
  displayDashboard(): void {
    const stats = this.getStats();

    console.log('\n📊 Performance Dashboard');
    console.log('━'.repeat(60));

    // CPU & Memory
    console.log(`\n💻 الموارد:`);
    console.log(`  CPU: ${stats.cpu.toFixed(2)}s`);
    console.log(
      `  Memory: ${stats.memory.used}MB / ${stats.memory.total}MB (${stats.memory.percentage}%)`
    );
    console.log(
      `  ${'█'.repeat(Math.floor(stats.memory.percentage / 10))}${'░'.repeat(10 - Math.floor(stats.memory.percentage / 10))} ${stats.memory.percentage}%`
    );

    // Cache
    console.log(`\n💾 Cache:`);
    console.log(`  Hit Rate: ${stats.cache.hitRate}%`);
    console.log(`  Size: ${stats.cache.size} items`);

    // API
    console.log(`\n⚡ API:`);
    console.log(`  Avg Response Time: ${stats.api.avgResponseTime}ms`);
    console.log(`  Error Rate: ${stats.api.errorRate}%`);

    // Hotspots
    if (stats.hotspots.length > 0) {
      console.log(`\n🔥 Hotspots:`);
      for (const hotspot of stats.hotspots) {
        console.log(`  ${hotspot.name}: ${hotspot.avgDuration}ms (${hotspot.calls} calls)`);
      }
    }

    console.log('\n' + '━'.repeat(60) + '\n');
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getMonitor(workingDirectory?: string): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor(workingDirectory || process.cwd());
  }
  return monitorInstance;
}
