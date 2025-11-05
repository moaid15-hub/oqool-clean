// notifications.ts
// ============================================
// 🔔 Change Notifications System - نظام إشعارات التغييرات
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationChannel = 'console' | 'slack' | 'discord' | 'email' | 'webhook';

export interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  slack?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
  };
  discord?: {
    webhookUrl: string;
    username?: string;
    avatarUrl?: string;
  };
  email?: {
    smtp: string;
    from: string;
    to: string[];
  };
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  filters?: {
    types?: NotificationType[];
    minLevel?: NotificationType;
  };
}

export class NotificationSystem {
  private config: NotificationConfig;
  private configPath: string;
  private history: Notification[] = [];

  constructor(workingDir: string = process.cwd()) {
    this.configPath = path.join(workingDir, '.oqool-guardian', 'notifications.json');
    this.config = {
      enabled: true,
      channels: ['console'],
    };
    this.loadConfig();
  }

  /**
   * تحميل إعدادات الإشعارات
   */
  private async loadConfig(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        this.config = await fs.readJson(this.configPath);
      }
    } catch (error) {
      // استخدام الإعدادات الافتراضية
    }
  }

  /**
   * حفظ إعدادات الإشعارات
   */
  async saveConfig(config: Partial<NotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, this.config, { spaces: 2 });
  }

  /**
   * إرسال إشعار
   */
  async send(notification: Omit<Notification, 'timestamp'>): Promise<void> {
    if (!this.config.enabled) return;

    const fullNotification: Notification = {
      ...notification,
      timestamp: new Date().toISOString(),
    };

    // تصفية الإشعارات
    if (!this.shouldSend(fullNotification)) return;

    // حفظ في السجل
    this.history.push(fullNotification);

    // إرسال عبر القنوات المفعلة
    const promises = this.config.channels.map((channel) => {
      switch (channel) {
        case 'console':
          return this.sendToConsole(fullNotification);
        case 'slack':
          return this.sendToSlack(fullNotification);
        case 'discord':
          return this.sendToDiscord(fullNotification);
        case 'webhook':
          return this.sendToWebhook(fullNotification);
        case 'email':
          return this.sendToEmail(fullNotification);
        default:
          return Promise.resolve();
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * التحقق من ضرورة إرسال الإشعار
   */
  private shouldSend(notification: Notification): boolean {
    if (!this.config.filters) return true;

    // تصفية حسب النوع
    if (this.config.filters.types && !this.config.filters.types.includes(notification.type)) {
      return false;
    }

    // تصفية حسب المستوى الأدنى
    if (this.config.filters.minLevel) {
      const levels: NotificationType[] = ['info', 'success', 'warning', 'error'];
      const minIndex = levels.indexOf(this.config.filters.minLevel);
      const currentIndex = levels.indexOf(notification.type);
      if (currentIndex < minIndex) return false;
    }

    return true;
  }

  /**
   * إرسال إلى Console
   */
  private async sendToConsole(notification: Notification): Promise<void> {
    const icon = this.getIcon(notification.type);
    const color = this.getColor(notification.type);

    console.log(color(`\n${icon} ${notification.title}`));
    console.log(color(`   ${notification.message}`));

    if (notification.metadata) {
      console.log(chalk.gray(`   المعلومات: ${JSON.stringify(notification.metadata, null, 2)}`));
    }
  }

  /**
   * إرسال إلى Slack
   */
  private async sendToSlack(notification: Notification): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      console.warn(chalk.yellow('⚠️ Slack webhook URL غير مهيأ'));
      return;
    }

    try {
      const color = this.getSlackColor(notification.type);
      const payload = {
        channel: this.config.slack.channel,
        username: this.config.slack.username || 'Oqool Guardian',
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            footer: 'Oqool AI',
            ts: Math.floor(new Date(notification.timestamp).getTime() / 1000),
            fields: notification.metadata
              ? Object.entries(notification.metadata).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                }))
              : [],
          },
        ],
      };

      await axios.post(this.config.slack.webhookUrl, payload);
    } catch (error) {
      console.error(chalk.red('❌ فشل إرسال الإشعار لـ Slack:', error));
    }
  }

  /**
   * إرسال إلى Discord
   */
  private async sendToDiscord(notification: Notification): Promise<void> {
    if (!this.config.discord?.webhookUrl) {
      console.warn(chalk.yellow('⚠️ Discord webhook URL غير مهيأ'));
      return;
    }

    try {
      const color = this.getDiscordColor(notification.type);
      const payload = {
        username: this.config.discord.username || 'Oqool Guardian',
        avatar_url: this.config.discord.avatarUrl,
        embeds: [
          {
            title: notification.title,
            description: notification.message,
            color,
            timestamp: notification.timestamp,
            footer: {
              text: 'Oqool AI',
            },
            fields: notification.metadata
              ? Object.entries(notification.metadata).map(([key, value]) => ({
                  name: key,
                  value: String(value),
                  inline: true,
                }))
              : [],
          },
        ],
      };

      await axios.post(this.config.discord.webhookUrl, payload);
    } catch (error) {
      console.error(chalk.red('❌ فشل إرسال الإشعار لـ Discord:', error));
    }
  }

  /**
   * إرسال إلى Webhook مخصص
   */
  private async sendToWebhook(notification: Notification): Promise<void> {
    if (!this.config.webhook?.url) {
      console.warn(chalk.yellow('⚠️ Webhook URL غير مهيأ'));
      return;
    }

    try {
      await axios.post(this.config.webhook.url, notification, {
        headers: this.config.webhook.headers,
      });
    } catch (error) {
      console.error(chalk.red('❌ فشل إرسال الإشعار لـ Webhook:', error));
    }
  }

  /**
   * إرسال إلى Email (TODO: يحتاج تطبيق SMTP)
   */
  private async sendToEmail(notification: Notification): Promise<void> {
    console.warn(chalk.yellow('⚠️ Email notifications لم يتم تطبيقه بعد'));
    // TODO: Implement SMTP email sending
  }

  /**
   * الحصول على الأيقونة المناسبة
   */
  private getIcon(type: NotificationType): string {
    const icons = {
      info: '🔔',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    };
    return icons[type];
  }

  /**
   * الحصول على اللون المناسب للـ Console
   */
  private getColor(type: NotificationType): typeof chalk {
    const colors = {
      info: chalk.cyan,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
    };
    return colors[type];
  }

  /**
   * الحصول على اللون المناسب لـ Slack
   */
  private getSlackColor(type: NotificationType): string {
    const colors = {
      info: '#36a64f', // أخضر
      success: '#2eb886', // أخضر فاتح
      warning: '#ff9900', // برتقالي
      error: '#ff0000', // أحمر
    };
    return colors[type];
  }

  /**
   * الحصول على اللون المناسب لـ Discord (decimal)
   */
  private getDiscordColor(type: NotificationType): number {
    const colors = {
      info: 3447003, // أزرق
      success: 3066993, // أخضر
      warning: 16776960, // أصفر
      error: 15158332, // أحمر
    };
    return colors[type];
  }

  /**
   * الحصول على سجل الإشعارات
   */
  getHistory(limit?: number): Notification[] {
    return limit ? this.history.slice(-limit) : this.history;
  }

  /**
   * مسح سجل الإشعارات
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * إشعارات جاهزة للأحداث الشائعة
   */
  async notifySnapshotCreated(snapshotId: string, fileCount: number): Promise<void> {
    await this.send({
      type: 'success',
      title: '📸 تم إنشاء لقطة جديدة',
      message: `تم إنشاء اللقطة ${snapshotId}`,
      metadata: {
        snapshotId,
        fileCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async notifyBackupSuccess(backupName: string, size: string): Promise<void> {
    await this.send({
      type: 'success',
      title: '💾 نسخ احتياطي ناجح',
      message: `تم النسخ الاحتياطي: ${backupName}`,
      metadata: {
        backupName,
        size,
      },
    });
  }

  async notifyBackupNeeded(daysSinceLastBackup: number): Promise<void> {
    await this.send({
      type: 'warning',
      title: '⏰ حان وقت النسخ الاحتياطي',
      message: `لم تقم بنسخ احتياطي منذ ${daysSinceLastBackup} يوم`,
      metadata: {
        daysSinceLastBackup,
      },
    });
  }

  async notifyTooManySnapshots(count: number): Promise<void> {
    await this.send({
      type: 'warning',
      title: '📌 لديك لقطات كثيرة',
      message: `لديك ${count} لقطة - يُنصح بالتنظيف`,
      metadata: {
        snapshotCount: count,
      },
    });
  }

  async notifyError(operation: string, error: string): Promise<void> {
    await this.send({
      type: 'error',
      title: `❌ فشل ${operation}`,
      message: error,
      metadata: {
        operation,
        error,
      },
    });
  }

  async notifyProjectGrowth(growthPercentage: number, currentSize: string): Promise<void> {
    await this.send({
      type: 'info',
      title: '📈 نمو المشروع',
      message: `المشروع نما بنسبة ${growthPercentage}% - الحجم الحالي: ${currentSize}`,
      metadata: {
        growthPercentage,
        currentSize,
      },
    });
  }

  async notifyFrequentFileChange(file: string, changeCount: number): Promise<void> {
    await this.send({
      type: 'info',
      title: '🔥 ملف يتغير بشكل متكرر',
      message: `الملف ${file} تغير ${changeCount} مرة`,
      metadata: {
        file,
        changeCount,
      },
    });
  }
}

export function createNotificationSystem(workingDir?: string): NotificationSystem {
  return new NotificationSystem(workingDir);
}
