// branding.ts - النسخة النظيفة والاحترافية
// ============================================
// استبدل الملف القديم بهذا
// ============================================

import chalk from 'chalk';
import gradient from 'gradient-string';

// ============================================
// Logo بسيط وأنيق
// ============================================
export const BRANDING = {
  logo: `
 ██████╗  ██████╗  ██████╗  ██████╗ ██╗     
██╔═══██╗██╔═══██╗██╔═══██╗██╔═══██╗██║     
██║   ██║██║   ██║██║   ██║██║   ██║██║     
██║   ██║██║▄▄ ██║██║   ██║██║   ██║██║     
╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝███████╗
 ╚═════╝  ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚══════╝
`,

  tagline: 'AI-Powered Arabic-First IDE',
  version: 'v5.0.0',
  website: 'oqoolai.com'
};

// ============================================
// عرض مبسط - فقط عند الضرورة
// ============================================
export function displayWelcome(): void {
  console.clear();
  
  // Logo ملوّن
  console.log(gradient.pastel.multiline(BRANDING.logo));
  console.log(chalk.gray(`         ${BRANDING.tagline}\n`));
}

// ============================================
// عرض سريع (بدون logo)
// ============================================
export function displayQuickStart(): void {
  console.log(chalk.cyan(`\n🚀 Oqool AI ${BRANDING.version}`));
  console.log(chalk.gray(`   ${BRANDING.tagline}\n`));
}

// ============================================
// رسائل الحالة - مبسطة
// ============================================
export function showSuccess(msg: string): void {
  console.log(chalk.green(`✓ ${msg}`));
}

export function showError(msg: string): void {
  console.log(chalk.red(`✗ ${msg}`));
}

export function showWarning(msg: string): void {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

export function showInfo(msg: string): void {
  console.log(chalk.blue(`ℹ ${msg}`));
}

// ============================================
// Spinner بسيط
// ============================================
export function createSpinner(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(chalk.cyan(`\r${frames[i]} ${message}...`));
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop: (finalMessage?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K'); // Clear line
      if (finalMessage) {
        showSuccess(finalMessage);
      }
    },
    
    fail: (errorMessage?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K');
      if (errorMessage) {
        showError(errorMessage);
      }
    },
    
    update: (newMessage: string) => {
      message = newMessage;
    }
  };
}

// ============================================
// Progress bar مبسط
// ============================================
export function showProgress(percent: number, label?: string): void {
  const width = 30;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = chalk.cyan('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  
  const text = label ? `${label}: ` : '';
  process.stdout.write(`\r${text}[${bar}] ${percent}%`);
  
  if (percent === 100) {
    console.log(''); // New line when complete
  }
}

// ============================================
// Helper - لا تعرض boxes ضخمة
// ============================================
export function showTip(message: string): void {
  console.log(chalk.yellow(`\n💡 ${message}\n`));
}

export function showNextSteps(steps: string[]): void {
  console.log(chalk.cyan('\n🎯 الخطوات التالية:\n'));
  steps.forEach((step, i) => {
    console.log(chalk.white(`  ${i + 1}. ${step}`));
  });
  console.log('');
}

// ============================================
// REMOVED: commandsBox, infoBox, warningBox
// هذه كانت تسبب الفوضى - محذوفة تماماً
// ============================================
