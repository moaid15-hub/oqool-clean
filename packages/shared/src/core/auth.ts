// auth.ts
// ============================================
// 🔐 نظام المصادقة وإدارة API Keys
// ============================================

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.oqool');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface OqoolConfig {
  apiKey: string;
  apiUrl: string;
  userId?: string;
  email?: string;
  plan?: string;
  lastSync?: string;
}

// إنشاء مجلد التكوين إذا لم يكن موجوداً
export async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

// حفظ التكوين
export async function saveConfig(config: OqoolConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
  console.log(chalk.green('✅ تم حفظ الإعدادات بنجاح'));
}

// تحميل التكوين
export async function loadConfig(): Promise<OqoolConfig | null> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      return await fs.readJson(CONFIG_FILE);
    }
    return null;
  } catch (error) {
    console.error(chalk.red('❌ خطأ في قراءة الإعدادات:'), error);
    return null;
  }
}

// التحقق من وجود API Key
export async function hasApiKey(): Promise<boolean> {
  const config = await loadConfig();
  return config !== null && !!config.apiKey;
}

// الحصول على API Key
export async function getApiKey(): Promise<string | null> {
  const config = await loadConfig();
  return config?.apiKey || null;
}

// تسجيل الخروج (حذف التكوين)
export async function logout(): Promise<void> {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      await fs.remove(CONFIG_FILE);
      console.log(chalk.yellow('👋 تم تسجيل الخروج بنجاح'));
    }
  } catch (error) {
    console.error(chalk.red('❌ خطأ في تسجيل الخروج:'), error);
  }
}

// التحقق من صحة API Key
export function validateApiKey(apiKey: string): boolean {
  // التحقق من صيغة المفتاح: oqool_xxxxxxxxxxxx
  const pattern = /^oqool_[a-zA-Z0-9]{20,}$/;
  return pattern.test(apiKey);
}

// عرض معلومات الحساب
export async function displayAccountInfo(): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    console.log(chalk.yellow('⚠️  لم تسجل دخول بعد'));
    console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>'));
    return;
  }

  console.log(chalk.blue.bold('\n📊 معلومات الحساب:'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.white('API Key:'), chalk.green(maskApiKey(config.apiKey)));
  console.log(chalk.white('API URL:'), chalk.cyan(config.apiUrl));

  if (config.email) {
    console.log(chalk.white('البريد:'), chalk.yellow(config.email));
  }

  if (config.plan) {
    const planEmoji = getPlanEmoji(config.plan);
    console.log(chalk.white('الباقة:'), planEmoji, chalk.magenta(config.plan));
  }

  if (config.lastSync) {
    console.log(chalk.white('آخر مزامنة:'), chalk.gray(config.lastSync));
  }

  console.log(chalk.gray('─'.repeat(50)));
}

// إخفاء جزء من API Key للأمان
function maskApiKey(apiKey: string): string {
  if (apiKey.length < 15) return apiKey;
  const visible = apiKey.substring(0, 10);
  const hidden = '*'.repeat(apiKey.length - 14);
  const end = apiKey.substring(apiKey.length - 4);
  return `${visible}${hidden}${end}`;
}

// الحصول على Emoji حسب الباقة
function getPlanEmoji(plan: string): string {
  const lower = plan.toLowerCase();
  if (lower.includes('free')) return '🆓';
  if (lower.includes('medium')) return '💎';
  if (lower.includes('expert') || lower.includes('premium')) return '👑';
  return '📦';
}
