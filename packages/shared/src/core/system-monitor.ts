// system-monitor.ts
// ============================================
// 📊 System Monitor - مراقب النظام المتقدم
// ============================================
// Real-time system monitoring and metrics collection
// ============================================

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

// ============================================
// 📊 Types & Interfaces
// ============================================

export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  processes: ProcessMetrics;
  timestamp: number;
}

export interface CPUMetrics {
  usage: number; // Overall CPU usage (0-100)
  cores: number; // Number of cores
  loadAverage: number[]; // 1, 5, 15 minute averages
  temperature?: number; // CPU temperature (if available)
  perCore: number[]; // Usage per core
}

export interface MemoryMetrics {
  total: number; // Total RAM in bytes
  used: number; // Used RAM in bytes
  free: number; // Free RAM in bytes
  available: number; // Available RAM in bytes
  usagePercent: number; // Usage percentage (0-100)
  swap: {
    total: number;
    used: number;
    free: number;
  };
}

export interface DiskMetrics {
  total: number; // Total disk space in bytes
  used: number; // Used disk space in bytes
  free: number; // Free disk space in bytes
  usagePercent: number; // Usage percentage (0-100)
  partitions: DiskPartition[];
  io?: {
    readSpeed: number; // KB/s
    writeSpeed: number; // KB/s
  };
}

export interface DiskPartition {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface NetworkMetrics {
  interfaces: NetworkInterface[];
  totalBytesReceived: number;
  totalBytesSent: number;
  downloadSpeed: number; // KB/s
  uploadSpeed: number; // KB/s
}

export interface NetworkInterface {
  name: string;
  address: string;
  netmask: string;
  family: string;
  mac: string;
  internal: boolean;
  bytesReceived: number;
  bytesSent: number;
}

export interface ProcessMetrics {
  total: number;
  running: number;
  sleeping: number;
  stopped: number;
  zombie: number;
  topProcesses: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryPercent: number;
  state: string;
  command: string;
}

export interface MonitoringConfig {
  interval?: number; // Monitoring interval in ms (default: 5000)
  enableCPU?: boolean;
  enableMemory?: boolean;
  enableDisk?: boolean;
  enableNetwork?: boolean;
  enableProcesses?: boolean;
  cpuThreshold?: number; // Alert threshold for CPU (0-100)
  memoryThreshold?: number; // Alert threshold for Memory (0-100)
  diskThreshold?: number; // Alert threshold for Disk (0-100)
}

export interface Alert {
  type: 'cpu' | 'memory' | 'disk' | 'process';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

// ============================================
// 📊 System Monitor Class
// ============================================

export class SystemMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private previousCPU: any = null;
  private previousNetwork: any = null;
  private platform: NodeJS.Platform;

  constructor(config: MonitoringConfig = {}) {
    super();

    this.config = {
      interval: config.interval || 5000,
      enableCPU: config.enableCPU !== false,
      enableMemory: config.enableMemory !== false,
      enableDisk: config.enableDisk !== false,
      enableNetwork: config.enableNetwork !== false,
      enableProcesses: config.enableProcesses !== false,
      cpuThreshold: config.cpuThreshold || 80,
      memoryThreshold: config.memoryThreshold || 85,
      diskThreshold: config.diskThreshold || 90,
    };

    this.platform = os.platform();
  }

  // ============================================
  // 🎯 Main Methods
  // ============================================

  /**
   * Start monitoring
   */
  public start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.emit('started');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.emit('metrics', metrics);

        // Check thresholds
        this.checkThresholds(metrics);
      } catch (error: any) {
        this.emit('error', error);
      }
    }, this.config.interval);

    // Initial collection
    this.collectMetrics().then((metrics) => {
      this.emit('metrics', metrics);
    });
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.isMonitoring = false;
    this.emit('stopped');
  }

  /**
   * Get current metrics
   */
  public async getMetrics(): Promise<SystemMetrics> {
    return await this.collectMetrics();
  }

  // ============================================
  // 📊 Metrics Collection
  // ============================================

  private async collectMetrics(): Promise<SystemMetrics> {
    const metrics: SystemMetrics = {
      cpu: await this.getCPUMetrics(),
      memory: await this.getMemoryMetrics(),
      disk: await this.getDiskMetrics(),
      network: await this.getNetworkMetrics(),
      processes: await this.getProcessMetrics(),
      timestamp: Date.now(),
    };

    return metrics;
  }

  // ============================================
  // 🔥 CPU Metrics
  // ============================================

  private async getCPUMetrics(): Promise<CPUMetrics> {
    if (!this.config.enableCPU) {
      return this.getEmptyCPUMetrics();
    }

    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Calculate CPU usage
    const usage = await this.calculateCPUUsage();
    const perCore = await this.calculatePerCoreUsage();

    return {
      usage,
      cores: cpus.length,
      loadAverage: loadAvg,
      perCore,
      temperature: await this.getCPUTemperature(),
    };
  }

  private async calculateCPUUsage(): Promise<number> {
    const cpus = os.cpus();

    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    if (this.previousCPU) {
      const idleDiff = totalIdle - this.previousCPU.idle;
      const totalDiff = totalTick - this.previousCPU.total;
      const usage = 100 - Math.floor((100 * idleDiff) / totalDiff);

      this.previousCPU = { idle: totalIdle, total: totalTick };
      return Math.max(0, Math.min(100, usage));
    }

    this.previousCPU = { idle: totalIdle, total: totalTick };
    return 0;
  }

  private async calculatePerCoreUsage(): Promise<number[]> {
    const cpus = os.cpus();
    return cpus.map(() => 0); // Simplified - would need more complex tracking
  }

  private async getCPUTemperature(): Promise<number | undefined> {
    try {
      if (this.platform === 'linux') {
        // Try to read from thermal sensors
        const thermalPaths = [
          '/sys/class/thermal/thermal_zone0/temp',
          '/sys/class/thermal/thermal_zone1/temp',
        ];

        for (const thermalPath of thermalPaths) {
          if (await fs.pathExists(thermalPath)) {
            const temp = await fs.readFile(thermalPath, 'utf-8');
            return parseInt(temp) / 1000; // Convert from millidegrees
          }
        }
      } else if (this.platform === 'darwin') {
        // macOS - use osx-temperature-sensor if available
        try {
          const { stdout } = await execAsync('osx-cpu-temp');
          const match = stdout.match(/(\d+\.?\d*)/);
          return match ? parseFloat(match[1]) : undefined;
        } catch {
          return undefined;
        }
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private getEmptyCPUMetrics(): CPUMetrics {
    return {
      usage: 0,
      cores: os.cpus().length,
      loadAverage: [0, 0, 0],
      perCore: [],
    };
  }

  // ============================================
  // 💾 Memory Metrics
  // ============================================

  private async getMemoryMetrics(): Promise<MemoryMetrics> {
    if (!this.config.enableMemory) {
      return this.getEmptyMemoryMetrics();
    }

    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    // Get available memory (different from free on Linux)
    const available = await this.getAvailableMemory();

    const usagePercent = (used / total) * 100;

    // Get swap info
    const swap = await this.getSwapInfo();

    return {
      total,
      used,
      free,
      available,
      usagePercent,
      swap,
    };
  }

  private async getAvailableMemory(): Promise<number> {
    try {
      if (this.platform === 'linux') {
        const meminfo = await fs.readFile('/proc/meminfo', 'utf-8');
        const match = meminfo.match(/MemAvailable:\s+(\d+)/);
        return match ? parseInt(match[1]) * 1024 : os.freemem();
      }
    } catch {
      return os.freemem();
    }
    return os.freemem();
  }

  private async getSwapInfo(): Promise<{ total: number; used: number; free: number }> {
    try {
      if (this.platform === 'linux') {
        const meminfo = await fs.readFile('/proc/meminfo', 'utf-8');
        const totalMatch = meminfo.match(/SwapTotal:\s+(\d+)/);
        const freeMatch = meminfo.match(/SwapFree:\s+(\d+)/);

        if (totalMatch && freeMatch) {
          const total = parseInt(totalMatch[1]) * 1024;
          const free = parseInt(freeMatch[1]) * 1024;
          return { total, used: total - free, free };
        }
      } else if (this.platform === 'darwin') {
        const { stdout } = await execAsync('sysctl vm.swapusage');
        const match = stdout.match(/total = ([\d.]+)M\s+used = ([\d.]+)M\s+free = ([\d.]+)M/);

        if (match) {
          const total = parseFloat(match[1]) * 1024 * 1024;
          const used = parseFloat(match[2]) * 1024 * 1024;
          const free = parseFloat(match[3]) * 1024 * 1024;
          return { total, used, free };
        }
      }
    } catch {
      // Ignore errors
    }

    return { total: 0, used: 0, free: 0 };
  }

  private getEmptyMemoryMetrics(): MemoryMetrics {
    return {
      total: 0,
      used: 0,
      free: 0,
      available: 0,
      usagePercent: 0,
      swap: { total: 0, used: 0, free: 0 },
    };
  }

  // ============================================
  // 💿 Disk Metrics
  // ============================================

  private async getDiskMetrics(): Promise<DiskMetrics> {
    if (!this.config.enableDisk) {
      return this.getEmptyDiskMetrics();
    }

    const partitions = await this.getDiskPartitions();

    const total = partitions.reduce((sum, p) => sum + p.total, 0);
    const used = partitions.reduce((sum, p) => sum + p.used, 0);
    const free = partitions.reduce((sum, p) => sum + p.free, 0);
    const usagePercent = total > 0 ? (used / total) * 100 : 0;

    return {
      total,
      used,
      free,
      usagePercent,
      partitions,
      io: await this.getDiskIO(),
    };
  }

  private async getDiskPartitions(): Promise<DiskPartition[]> {
    const partitions: DiskPartition[] = [];

    try {
      if (this.platform === 'linux' || this.platform === 'darwin') {
        const { stdout } = await execAsync('df -k');
        const lines = stdout.trim().split('\n').slice(1); // Skip header

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 6) {
            const device = parts[0];
            const total = parseInt(parts[1]) * 1024;
            const used = parseInt(parts[2]) * 1024;
            const free = parseInt(parts[3]) * 1024;
            const usagePercent = parseFloat(parts[4]);
            const mountpoint = parts[5];

            // Skip special filesystems
            if (!device.startsWith('/dev/') && !device.startsWith('disk')) {
              continue;
            }

            partitions.push({
              device,
              mountpoint,
              fstype: 'unknown',
              total,
              used,
              free,
              usagePercent,
            });
          }
        }
      } else if (this.platform === 'win32') {
        // Windows - use wmic
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\n').slice(1);

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const device = parts[0];
            const free = parseInt(parts[1]) || 0;
            const total = parseInt(parts[2]) || 0;
            const used = total - free;
            const usagePercent = total > 0 ? (used / total) * 100 : 0;

            partitions.push({
              device,
              mountpoint: device,
              fstype: 'NTFS',
              total,
              used,
              free,
              usagePercent,
            });
          }
        }
      }
    } catch (error) {
      // Fallback: return current directory info
      // This is not accurate but prevents complete failure
    }

    return partitions;
  }

  private async getDiskIO(): Promise<{ readSpeed: number; writeSpeed: number } | undefined> {
    // Simplified - would need persistent tracking for accurate speeds
    return undefined;
  }

  private getEmptyDiskMetrics(): DiskMetrics {
    return {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0,
      partitions: [],
    };
  }

  // ============================================
  // 🌐 Network Metrics
  // ============================================

  private async getNetworkMetrics(): Promise<NetworkMetrics> {
    if (!this.config.enableNetwork) {
      return this.getEmptyNetworkMetrics();
    }

    const interfaces = await this.getNetworkInterfaces();

    const totalBytesReceived = interfaces.reduce((sum, i) => sum + i.bytesReceived, 0);
    const totalBytesSent = interfaces.reduce((sum, i) => sum + i.bytesSent, 0);

    // Calculate speeds (requires previous data)
    let downloadSpeed = 0;
    let uploadSpeed = 0;

    if (this.previousNetwork) {
      const timeDiff = (Date.now() - this.previousNetwork.timestamp) / 1000; // seconds
      downloadSpeed = (totalBytesReceived - this.previousNetwork.received) / timeDiff / 1024; // KB/s
      uploadSpeed = (totalBytesSent - this.previousNetwork.sent) / timeDiff / 1024; // KB/s
    }

    this.previousNetwork = {
      received: totalBytesReceived,
      sent: totalBytesSent,
      timestamp: Date.now(),
    };

    return {
      interfaces,
      totalBytesReceived,
      totalBytesSent,
      downloadSpeed: Math.max(0, downloadSpeed),
      uploadSpeed: Math.max(0, uploadSpeed),
    };
  }

  private async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    const networkInterfaces = os.networkInterfaces();
    const result: NetworkInterface[] = [];

    for (const [name, addresses] of Object.entries(networkInterfaces)) {
      if (!addresses) continue;

      for (const addr of addresses) {
        result.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          family: addr.family,
          mac: addr.mac,
          internal: addr.internal,
          bytesReceived: 0, // Would need system-specific commands
          bytesSent: 0, // Would need system-specific commands
        });
      }
    }

    return result;
  }

  private getEmptyNetworkMetrics(): NetworkMetrics {
    return {
      interfaces: [],
      totalBytesReceived: 0,
      totalBytesSent: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
    };
  }

  // ============================================
  // 🔧 Process Metrics
  // ============================================

  private async getProcessMetrics(): Promise<ProcessMetrics> {
    if (!this.config.enableProcesses) {
      return this.getEmptyProcessMetrics();
    }

    const topProcesses = await this.getTopProcesses();

    const total = topProcesses.length;
    const running = topProcesses.filter((p) => p.state === 'R').length;
    const sleeping = topProcesses.filter((p) => p.state === 'S').length;
    const stopped = topProcesses.filter((p) => p.state === 'T').length;
    const zombie = topProcesses.filter((p) => p.state === 'Z').length;

    return {
      total,
      running,
      sleeping,
      stopped,
      zombie,
      topProcesses: topProcesses.slice(0, 10), // Top 10
    };
  }

  private async getTopProcesses(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];

    try {
      if (this.platform === 'linux' || this.platform === 'darwin') {
        const { stdout } = await execAsync('ps aux --sort=-%cpu | head -20');
        const lines = stdout.trim().split('\n').slice(1); // Skip header

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              pid: parseInt(parts[1]),
              name: parts[10],
              cpuUsage: parseFloat(parts[2]),
              memoryUsage: 0,
              memoryPercent: parseFloat(parts[3]),
              state: parts[7] || 'S',
              command: parts.slice(10).join(' '),
            });
          }
        }
      } else if (this.platform === 'win32') {
        // Windows - use tasklist
        const { stdout } = await execAsync('tasklist /FO CSV /NH');
        const lines = stdout.trim().split('\n');

        for (const line of lines.slice(0, 10)) {
          const parts = line.split(',').map((s) => s.replace(/"/g, ''));
          if (parts.length >= 2) {
            processes.push({
              pid: parseInt(parts[1]) || 0,
              name: parts[0],
              cpuUsage: 0,
              memoryUsage: 0,
              memoryPercent: 0,
              state: 'R',
              command: parts[0],
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return processes;
  }

  private getEmptyProcessMetrics(): ProcessMetrics {
    return {
      total: 0,
      running: 0,
      sleeping: 0,
      stopped: 0,
      zombie: 0,
      topProcesses: [],
    };
  }

  // ============================================
  // ⚠️ Threshold Checking
  // ============================================

  private checkThresholds(metrics: SystemMetrics): void {
    // CPU threshold
    if (this.config.cpuThreshold && metrics.cpu.usage > this.config.cpuThreshold) {
      const alert: Alert = {
        type: 'cpu',
        severity: metrics.cpu.usage > 95 ? 'critical' : 'warning',
        message: `CPU usage is ${metrics.cpu.usage.toFixed(1)}%`,
        value: metrics.cpu.usage,
        threshold: this.config.cpuThreshold,
        timestamp: Date.now(),
      };
      this.emit('alert', alert);
    }

    // Memory threshold
    if (this.config.memoryThreshold && metrics.memory.usagePercent > this.config.memoryThreshold) {
      const alert: Alert = {
        type: 'memory',
        severity: metrics.memory.usagePercent > 95 ? 'critical' : 'warning',
        message: `Memory usage is ${metrics.memory.usagePercent.toFixed(1)}%`,
        value: metrics.memory.usagePercent,
        threshold: this.config.memoryThreshold,
        timestamp: Date.now(),
      };
      this.emit('alert', alert);
    }

    // Disk threshold
    if (this.config.diskThreshold && metrics.disk.usagePercent > this.config.diskThreshold) {
      const alert: Alert = {
        type: 'disk',
        severity: metrics.disk.usagePercent > 95 ? 'critical' : 'warning',
        message: `Disk usage is ${metrics.disk.usagePercent.toFixed(1)}%`,
        value: metrics.disk.usagePercent,
        threshold: this.config.diskThreshold,
        timestamp: Date.now(),
      };
      this.emit('alert', alert);
    }
  }

  // ============================================
  // 🛠️ Utility Methods
  // ============================================

  public isActive(): boolean {
    return this.isMonitoring;
  }

  public updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart if monitoring
    if (this.isMonitoring) {
      this.stop();
      this.start();
    }
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// ============================================
// 🏭 Factory Function
// ============================================

export function createSystemMonitor(config?: MonitoringConfig): SystemMonitor {
  return new SystemMonitor(config);
}

// ============================================
// Export (Already exported via export class/interface above)
// ============================================
