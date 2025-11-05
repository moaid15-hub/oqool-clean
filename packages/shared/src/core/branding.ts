// branding.ts - النسخة النهائية

import chalk from 'chalk';

export const BRANDING = {
  // شعار ثلاثي الأبعاد بدون إطار - أزرق وأبيض
  logo: `
        ${chalk.cyan('██████')}   ${chalk.cyan('██████')}   ${chalk.cyan('██████')}   ${chalk.cyan('██████')}  ${chalk.cyan('██')}
       ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}
       ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}
       ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('  ████')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}${chalk.white('    ██')} ${chalk.cyan('██')}
        ${chalk.cyan('██████')}   ${chalk.cyan('████ ██')}  ${chalk.cyan('██████')}   ${chalk.cyan('██████')}  ${chalk.cyan('███████')}
`,

  // صندوق المعلومات - أبيض
  infoBox: chalk.white(`
   ╔═══════════════════════════════════════════════════════╗
   ║                                                       ║
   ║   OQOOLAI CODER  │  أداة البرمجة الذكية             ║
   ║                                                       ║
   ║   النسخة: 5.0.0  │  مدعوم بالذكاء الاصطناعي        ║
   ║   oqoolai.com    │  Oqool AI Team                    ║
   ║                                                       ║
   ╚═══════════════════════════════════════════════════════╝
`),

  // صندوق الأوامر - أبيض
  commandsBox: chalk.white(`
   ╔═══════════════════════════════════════════════════════╗
   ║                                                       ║
   ║  أوامر الحفظ والحماية                                ║
   ║                                                       ║
   ║    init          تهيئة المشروع                       ║
   ║    snapshot      حفظ نقطة استعادة                    ║
   ║    rollback      التراجع لنقطة سابقة                 ║
   ║    diff          مقارنة التغييرات                    ║
   ║    restore       استعادة ملف                         ║
   ║    history       عرض السجل                           ║
   ║    suggestions   اقتراحات ذكية                      ║
   ║    timeline      الخط الزمني                         ║
   ║    list / ls     عرض كل النقاط                      ║
   ║    backup        نسخة احتياطية كاملة                ║
   ║    analytics     تحليل وإحصائيات                    ║
   ║    archaeology   تاريخ المشروع المفصّل              ║
   ║                                                       ║
   ╚═══════════════════════════════════════════════════════╝
`),

  // تحذير الأمان - أصفر
  warningBox: chalk.yellow(`
   ⚠️  للعمل بأمان: اعمل نسخة من الملف يدوياً وضعها بمكان آمن
`),
};

// عرض الشاشة الرئيسية
export function displayWelcome() {
  console.clear();
  console.log(BRANDING.logo);
  console.log('');
  console.log('');
  console.log(BRANDING.infoBox);
  console.log('');
  console.log('');
  console.log(BRANDING.commandsBox);
  console.log('');
  console.log('');
  console.log(BRANDING.warningBox);
  console.log('');
}

// رسائل الحالة - ملونة
export function showSuccess(msg: string) {
  console.log(chalk.green(`\n   ✓ ${msg}\n`));
}

export function showError(msg: string) {
  console.log(chalk.red(`\n   ✗ ${msg}\n`));
}

export function showInfo(msg: string) {
  console.log(chalk.white(`\n   ℹ ${msg}\n`));
}

// Loading spinner - أبيض
export function createSpinner(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(chalk.white(`\r   ${frames[i]} ${message}...`));
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop: (finalMessage?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K');
      if (finalMessage) showSuccess(finalMessage);
    },
    fail: (errorMessage?: string) => {
      clearInterval(interval);
      process.stdout.write('\r\x1b[K');
      if (errorMessage) showError(errorMessage);
    },
  };
}

// Progress bar - أبيض مع أزرق
export function showProgress(percent: number, label: string) {
  const width = 40;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));

  console.log(chalk.white(`   ${label}: [${bar}] ${percent}%`));
}
