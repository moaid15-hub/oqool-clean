// cli-auto-fix-command.ts
// ============================================
// 🔧 أمر CLI للإصلاح التلقائي المتقدم
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { createAutoFixSystem } from './auto-fix-system.js';
import { hasApiKey } from './auth.js';

/**
 * إضافة أمر auto-fix للـ CLI
 */
export function addAutoFixCommand(program: Command) {
  const autoFixCommand = program
    .command('auto-fix <file>')
    .description('🔧 نظام الإصلاح التلقائي المتقدم بالمراحل والأولويات')
    .option('-a, --auto-apply', 'تطبيق الإصلاحات تلقائياً بدون سؤال')
    .option('-i, --interactive', 'وضع تفاعلي (يسأل عن كل إصلاح)', true)
    .option('--only <stages>', 'تشغيل مراحل محددة فقط (مفصولة بفواصل)')
    .option('--skip <stages>', 'تخطي مراحل معينة (مفصولة بفواصل)')
    .option('--no-syntax', 'تخطي مرحلة Syntax')
    .option('--no-security', 'تخطي مرحلة Security')
    .option('--no-types', 'تخطي مرحلة Types')
    .option('--no-performance', 'تخطي مرحلة Performance')
    .option('--no-style', 'تخطي مرحلة Style')
    .option('-s, --show-stages', 'عرض المراحل المتاحة فقط')
    .action(async (file: string, options: any) => {
      await handleAutoFix(file, options);
    });

  return autoFixCommand;
}

/**
 * معالج أمر auto-fix
 */
async function handleAutoFix(file: string, options: any) {
  try {
    // التحقق من تسجيل الدخول
    if (!(await hasApiKey())) {
      console.log(chalk.yellow('⚠️  يجب تسجيل الدخول أولاً'));
      console.log(chalk.cyan('استخدم: oqool-code login <API_KEY>\n'));
      return;
    }

    const autoFix = createAutoFixSystem();

    // عرض المراحل فقط
    if (options.showStages) {
      displayStages(autoFix);
      return;
    }

    // عرض البانر
    displayBanner();

    // تحديد المراحل
    let skipStages: string[] = [];
    let onlyStages: string[] = [];

    if (options.only) {
      onlyStages = options.only.split(',').map((s: string) => s.trim());
    } else if (options.skip) {
      skipStages = options.skip.split(',').map((s: string) => s.trim());
    } else {
      // استخدام الخيارات الفردية
      if (options.syntax === false) skipStages.push('syntax');
      if (options.security === false) skipStages.push('security');
      if (options.types === false) skipStages.push('types');
      if (options.performance === false) skipStages.push('performance');
      if (options.style === false) skipStages.push('style');
    }

    // تأكيد من المستخدم إذا لم يكن auto-apply
    if (!options.autoApply && options.interactive) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `هل تريد بدء الإصلاح التلقائي لـ ${file}؟`,
          default: true,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\n⏭️  تم الإلغاء'));
        return;
      }
    }

    // تشغيل الإصلاح
    console.log(''); // سطر فارغ
    const result = await autoFix.fix({
      file,
      autoApply: options.autoApply,
      skipStages,
      onlyStages,
      interactive: options.interactive,
    });

    // عرض النتيجة النهائية
    displayFinalSummary(result);

    // اقتراحات إضافية
    if (result.suggestedIssues > 0) {
      displaySuggestions();
    }
  } catch (error: any) {
    console.error(chalk.red('\n❌ خطأ:'), error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  }
}

/**
 * عرض البانر
 */
function displayBanner() {
  console.log(chalk.cyan('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║     🔧 نظام الإصلاح التلقائي المتقدم        ║'));
  console.log(chalk.cyan('║          Oqool Auto-Fix System               ║'));
  console.log(chalk.cyan('╚════════════════════════════════════════════════╝\n'));
}

/**
 * عرض المراحل المتاحة
 */
function displayStages(autoFix: any) {
  console.log(chalk.cyan('\n════════════════════════════════════════════════'));
  console.log(chalk.cyan('   📋 المراحل المتاحة'));
  console.log(chalk.cyan('════════════════════════════════════════════════\n'));

  const stages = autoFix.getStages();

  // تجميع حسب الأولوية
  const p1Stages = stages.filter((s: any) => s.priority === 'P1');
  const p2Stages = stages.filter((s: any) => s.priority === 'P2');
  const p3Stages = stages.filter((s: any) => s.priority === 'P3');

  // P1
  console.log(chalk.red.bold('🔴 المرحلة الأولى (P1) - أولوية عالية جداً\n'));
  p1Stages.forEach((stage: any) => {
    const actionEmoji =
      stage.action === 'auto'
        ? '⚡ إصلاح تلقائي'
        : stage.action === 'ask'
          ? '❓ يسأل المستخدم'
          : '💡 اقتراحات';
    console.log(chalk.white(`   • ${stage.name}`));
    console.log(chalk.gray(`     ${actionEmoji}`));
    console.log(chalk.gray(`     ${stage.description}\n`));
  });

  // P2
  console.log(chalk.yellow.bold('🟡 المرحلة الثانية (P2) - أولوية متوسطة\n'));
  p2Stages.forEach((stage: any) => {
    const actionEmoji =
      stage.action === 'auto'
        ? '⚡ إصلاح تلقائي'
        : stage.action === 'ask'
          ? '❓ يسأل المستخدم'
          : '💡 اقتراحات';
    console.log(chalk.white(`   • ${stage.name}`));
    console.log(chalk.gray(`     ${actionEmoji}`));
    console.log(chalk.gray(`     ${stage.description}\n`));
  });

  // P3
  console.log(chalk.blue.bold('🔵 المرحلة الثالثة (P3) - تحسينات\n'));
  p3Stages.forEach((stage: any) => {
    const actionEmoji =
      stage.action === 'auto'
        ? '⚡ إصلاح تلقائي'
        : stage.action === 'ask'
          ? '❓ يسأل المستخدم'
          : '💡 اقتراحات';
    console.log(chalk.white(`   • ${stage.name}`));
    console.log(chalk.gray(`     ${actionEmoji}`));
    console.log(chalk.gray(`     ${stage.description}\n`));
  });

  console.log(chalk.cyan('════════════════════════════════════════════════\n'));

  // أمثلة الاستخدام
  console.log(chalk.yellow('📚 أمثلة الاستخدام:\n'));
  console.log(chalk.white('   # إصلاح شامل بدون سؤال'));
  console.log(chalk.gray('   $ oqool-code auto-fix src/app.ts --auto-apply\n'));

  console.log(chalk.white('   # إصلاح P1 فقط (Syntax + Security)'));
  console.log(chalk.gray('   $ oqool-code auto-fix src/app.ts --only syntax,security\n'));

  console.log(chalk.white('   # إصلاح كل شيء ماعدا Performance'));
  console.log(chalk.gray('   $ oqool-code auto-fix src/app.ts --skip performance\n'));

  console.log(chalk.white('   # وضع تفاعلي (يسأل عن كل شيء)'));
  console.log(chalk.gray('   $ oqool-code auto-fix src/app.ts --interactive\n'));

  console.log(chalk.white('   # تخطي مراحل معينة'));
  console.log(chalk.gray('   $ oqool-code auto-fix src/app.ts --no-performance --no-style\n'));
}

/**
 * عرض الملخص النهائي
 */
function displayFinalSummary(result: any) {
  console.log(chalk.cyan('\n════════════════════════════════════════════════'));
  console.log(chalk.cyan('   ✅ اكتمل الإصلاح التلقائي'));
  console.log(chalk.cyan('════════════════════════════════════════════════\n'));

  // النتيجة العامة
  if (result.totalIssues === 0) {
    console.log(chalk.green('✨ الكود نظيف تماماً! لا توجد مشاكل.\n'));
    return;
  }

  // الإحصائيات
  const successRate = ((result.fixedIssues / result.totalIssues) * 100).toFixed(1);

  console.log(chalk.white(`📊 المشاكل المكتشفة: ${result.totalIssues}`));
  console.log(chalk.green(`✅ تم الإصلاح: ${result.fixedIssues} (${successRate}%)`));

  if (result.suggestedIssues > 0) {
    console.log(chalk.cyan(`💡 اقتراحات: ${result.suggestedIssues}`));
  }

  if (result.skippedIssues > 0) {
    console.log(chalk.yellow(`⏭️  متخطى: ${result.skippedIssues}`));
  }

  // شريط التقدم
  console.log('\n' + createProgressBar(result.fixedIssues, result.totalIssues));

  // تفاصيل المراحل
  if (Object.keys(result.stages).length > 0) {
    console.log(chalk.gray('\n───────────────────────────────────────────────'));
    console.log(chalk.white('📋 تفاصيل المراحل:\n'));

    for (const [stageName, stageResult] of Object.entries(result.stages) as any) {
      if (stageResult.issues > 0) {
        const emoji = getStageEmoji(stageName);
        console.log(chalk.white(`${emoji} ${formatStageName(stageName)}`));
        console.log(
          chalk.gray(
            `   المشاكل: ${stageResult.issues} | المصلحة: ${stageResult.fixed} | الاقتراحات: ${stageResult.suggested}`
          )
        );
      }
    }
  }

  console.log(chalk.cyan('\n════════════════════════════════════════════════\n'));

  // رسالة النجاح
  if (result.fixedIssues > 0) {
    console.log(chalk.green.bold(`🎉 تم إصلاح ${result.fixedIssues} مشكلة بنجاح!\n`));
  }
}

/**
 * عرض الاقتراحات
 */
function displaySuggestions() {
  console.log(chalk.cyan('💡 نصائح إضافية:\n'));
  console.log(chalk.white('   • راجع اقتراحات الأداء لتحسين سرعة التطبيق'));
  console.log(chalk.white('   • استخدم --auto-apply في المرة القادمة للإصلاح السريع'));
  console.log(chalk.white('   • شغّل الاختبارات للتأكد من عمل الكود بشكل صحيح\n'));
}

/**
 * إنشاء شريط تقدم
 */
function createProgressBar(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * 30);
  const empty = 30 - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `${bar} ${percentage}%`;
}

/**
 * الحصول على إيموجي المرحلة
 */
function getStageEmoji(stageName: string): string {
  const emojis: { [key: string]: string } = {
    syntax: '🔤',
    security: '🔒',
    types: '🏷️',
    performance: '⚡',
    style: '🎨',
  };
  return emojis[stageName] || '📝';
}

/**
 * تنسيق اسم المرحلة
 */
function formatStageName(stageName: string): string {
  const names: { [key: string]: string } = {
    syntax: 'Syntax Fixing',
    security: 'Security Fixing',
    types: 'Type Fixing',
    performance: 'Performance Optimization',
    style: 'Style Fixing',
  };
  return names[stageName] || stageName;
}

/**
 * Export
 */
export { handleAutoFix, displayStages };
