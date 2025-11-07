// queue-system.ts
// ============================================
// 📋 نظام الطوابير - Queue System
// معالجة متوازية وتوزيع ذكي
// ============================================

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface QueuedTask {
  id: string;
  request: string;
  priority: TaskPriority;
  parallel: boolean;
  timestamp: number;
  retries: number;
}

export class QueueSystem {
  private static instance: QueueSystem;
  private queue: QueuedTask[] = [];
  private processing = false;
  private maxConcurrent = 3;

  private constructor() {}

  static getInstance(): QueueSystem {
    if (!QueueSystem.instance) {
      QueueSystem.instance = new QueueSystem();
    }
    return QueueSystem.instance;
  }

  enqueue(task: Omit<QueuedTask, 'id' | 'timestamp' | 'retries'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.queue.push({
      ...task,
      id,
      timestamp: Date.now(),
      retries: 0
    });

    this.sortQueue();
    return id;
  }

  private sortQueue(): void {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

    this.queue.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  process(): { parallel: QueuedTask[]; sequential: QueuedTask[]; priority: QueuedTask[] } {
    const urgent = this.queue.filter(t => t.priority === 'urgent');
    const parallel = this.queue.filter(t => t.parallel && t.priority !== 'urgent');
    const sequential = this.queue.filter(t => !t.parallel && t.priority !== 'urgent');

    return {
      parallel: parallel.slice(0, this.maxConcurrent),
      sequential,
      priority: urgent
    };
  }

  dequeue(id: string): QueuedTask | undefined {
    const index = this.queue.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    return this.queue.splice(index, 1)[0];
  }

  optimize(): void {
    // تجميع المهام المتشابهة
    const grouped = new Map<string, QueuedTask[]>();

    this.queue.forEach(task => {
      const key = task.request.substring(0, 50);
      const group = grouped.get(key) || [];
      group.push(task);
      grouped.set(key, group);
    });

    // إعادة ترتيب
    this.sortQueue();
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      urgent: this.queue.filter(t => t.priority === 'urgent').length,
      high: this.queue.filter(t => t.priority === 'high').length,
      normal: this.queue.filter(t => t.priority === 'normal').length,
      low: this.queue.filter(t => t.priority === 'low').length,
      parallel: this.queue.filter(t => t.parallel).length
    };
  }

  clear(): void {
    this.queue = [];
  }
}

export function getQueueSystem(): QueueSystem {
  return QueueSystem.getInstance();
}
