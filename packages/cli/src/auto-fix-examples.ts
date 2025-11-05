// auto-fix-examples.ts
// ============================================
// 📚 أمثلة على استخدام نظام الإصلاح التلقائي
// ============================================

import { createAutoFixSystem } from './auto-fix-system.js';
import chalk from 'chalk';

/**
 * مثال 1: إصلاح ملف بسيط
 */
async function example1_BasicFix() {
  console.log(chalk.cyan('\n📝 مثال 1: إصلاح أساسي\n'));

  const autoFix = createAutoFixSystem();

  const result = await autoFix.fix({
    file: 'src/example.ts',
    autoApply: true,
  });

  console.log(chalk.green(`✅ تم إصلاح ${result.fixedIssues} مشكلة`));
}

/**
 * مثال 2: إصلاح تفاعلي (يسأل المستخدم)
 */
async function example2_InteractiveFix() {
  console.log(chalk.cyan('\n🔄 مثال 2: إصلاح تفاعلي\n'));

  const autoFix = createAutoFixSystem();

  const result = await autoFix.fix({
    file: 'src/example.ts',
    autoApply: false, // سيسأل المستخدم
    interactive: true,
  });

  console.log(chalk.green(`✅ النتيجة:`));
  console.log(chalk.white(`   - مشاكل مكتشفة: ${result.totalIssues}`));
  console.log(chalk.white(`   - تم الإصلاح: ${result.fixedIssues}`));
  console.log(chalk.white(`   - اقتراحات: ${result.suggestedIssues}`));
}

/**
 * مثال 3: إصلاح مراحل محددة فقط
 */
async function example3_SpecificStages() {
  console.log(chalk.cyan('\n🎯 مثال 3: مراحل محددة\n'));

  const autoFix = createAutoFixSystem();

  // فقط P1: Syntax + Security
  const result = await autoFix.fix({
    file: 'src/example.ts',
    onlyStages: ['syntax', 'security'],
    autoApply: true,
  });

  console.log(chalk.green(`✅ تم إصلاح P1 فقط`));
}

/**
 * مثال 4: تخطي مراحل معينة
 */
async function example4_SkipStages() {
  console.log(chalk.cyan('\n⏭️  مثال 4: تخطي مراحل\n'));

  const autoFix = createAutoFixSystem();

  // كل المراحل ماعدا Performance
  const result = await autoFix.fix({
    file: 'src/example.ts',
    skipStages: ['performance'],
    autoApply: true,
  });

  console.log(chalk.green(`✅ تم إصلاح كل المراحل ماعدا Performance`));
}

/**
 * مثال 5: الحصول على معلومات المراحل
 */
function example5_StageInfo() {
  console.log(chalk.cyan('\n📊 مثال 5: معلومات المراحل\n'));

  const autoFix = createAutoFixSystem();
  const stages = autoFix.getStages();

  console.log(chalk.yellow('المراحل المتاحة:\n'));

  stages.forEach((stage, index) => {
    const priorityColor =
      stage.priority === 'P1' ? chalk.red : stage.priority === 'P2' ? chalk.yellow : chalk.blue;

    const actionEmoji = stage.action === 'auto' ? '⚡' : stage.action === 'ask' ? '❓' : '💡';

    console.log(`${index + 1}. ${actionEmoji} ${stage.name}`);
    console.log(`   ${priorityColor(stage.priority)} | ${stage.action.toUpperCase()}`);
    console.log(`   ${stage.description}\n`);
  });
}

/**
 * مثال 6: استخدام برمجي كامل
 */
async function example6_ProgrammaticUsage() {
  console.log(chalk.cyan('\n💻 مثال 6: استخدام برمجي\n'));

  const autoFix = createAutoFixSystem('./my-project');

  try {
    // 1. عرض المراحل
    const stages = autoFix.getStages();
    console.log(chalk.white(`عدد المراحل: ${stages.length}`));

    // 2. تشغيل الإصلاح
    const result = await autoFix.fix({
      file: 'src/app.ts',
      autoApply: true,
      interactive: false,
    });

    // 3. فحص النتائج
    if (result.success) {
      console.log(chalk.green('✅ نجح الإصلاح'));

      // 4. عرض التفاصيل
      for (const [stageName, stageResult] of Object.entries(result.stages)) {
        if (stageResult.issues > 0) {
          console.log(chalk.white(`\n${stageName}:`));
          console.log(chalk.gray(`  مشاكل: ${stageResult.issues}`));
          console.log(chalk.gray(`  مصلحة: ${stageResult.fixed}`));
        }
      }

      // 5. حفظ الكود المصلح (إذا لم يكن autoApply)
      if (result.finalCode) {
        // يمكن حفظه يدوياً
        console.log(chalk.cyan('\n📄 الكود المصلح جاهز'));
      }
    } else {
      console.log(chalk.red('❌ فشل الإصلاح'));
    }
  } catch (error: any) {
    console.error(chalk.red('❌ خطأ:'), error.message);
  }
}

/**
 * مثال 7: Pipeline كامل
 */
async function example7_FullPipeline() {
  console.log(chalk.cyan('\n🔄 مثال 7: Pipeline كامل\n'));

  const autoFix = createAutoFixSystem();

  // مرحلة 1: P1 فقط (إصلاح تلقائي)
  console.log(chalk.yellow('المرحلة 1: P1 (Syntax + Security)'));
  await autoFix.fix({
    file: 'src/app.ts',
    onlyStages: ['syntax', 'security'],
    autoApply: true,
    interactive: true,
  });

  // مرحلة 2: P2 (Types)
  console.log(chalk.yellow('\nالمرحلة 2: P2 (Types)'));
  await autoFix.fix({
    file: 'src/app.ts',
    onlyStages: ['types'],
    autoApply: true,
  });

  // مرحلة 3: P3 (Performance + Style)
  console.log(chalk.yellow('\nالمرحلة 3: P3 (Performance + Style)'));
  await autoFix.fix({
    file: 'src/app.ts',
    onlyStages: ['performance', 'style'],
    autoApply: true,
  });

  console.log(chalk.green('\n✅ اكتمل Pipeline!'));
}

/**
 * مثال 8: معالجة ملفات متعددة
 */
async function example8_MultipleFiles() {
  console.log(chalk.cyan('\n📁 مثال 8: ملفات متعددة\n'));

  const autoFix = createAutoFixSystem();
  const files = ['src/utils.ts', 'src/helpers.ts', 'src/services.ts'];

  const results = [];

  for (const file of files) {
    console.log(chalk.white(`\n🔄 معالجة: ${file}`));

    try {
      const result = await autoFix.fix({
        file,
        autoApply: true,
        interactive: false,
      });

      results.push({
        file,
        success: result.success,
        fixed: result.fixedIssues,
      });

      console.log(chalk.green(`✅ تم - إصلاح ${result.fixedIssues} مشكلة`));
    } catch (error: any) {
      console.log(chalk.red(`❌ فشل: ${error.message}`));
      results.push({
        file,
        success: false,
        fixed: 0,
      });
    }
  }

  // ملخص
  console.log(chalk.cyan('\n═══════════════════════════════'));
  console.log(chalk.cyan('   📊 ملخص النتائج'));
  console.log(chalk.cyan('═══════════════════════════════\n'));

  const successful = results.filter((r) => r.success).length;
  const totalFixed = results.reduce((sum, r) => sum + r.fixed, 0);

  console.log(chalk.white(`✅ ملفات ناجحة: ${successful}/${files.length}`));
  console.log(chalk.white(`🔧 إجمالي الإصلاحات: ${totalFixed}`));
}

/**
 * تشغيل جميع الأمثلة
 */
async function runAllExamples() {
  console.log(chalk.cyan('\n════════════════════════════════════════════════'));
  console.log(chalk.cyan('   🚀 أمثلة نظام الإصلاح التلقائي'));
  console.log(chalk.cyan('════════════════════════════════════════════════'));

  // معلومات فقط
  example5_StageInfo();

  // يمكن تشغيل الأمثلة الأخرى حسب الحاجة
  // await example1_BasicFix();
  // await example2_InteractiveFix();
  // await example3_SpecificStages();
  // await example4_SkipStages();
  // await example6_ProgrammaticUsage();
  // await example7_FullPipeline();
  // await example8_MultipleFiles();
}

// Export للاستخدام
export {
  example1_BasicFix,
  example2_InteractiveFix,
  example3_SpecificStages,
  example4_SkipStages,
  example5_StageInfo,
  example6_ProgrammaticUsage,
  example7_FullPipeline,
  example8_MultipleFiles,
  runAllExamples,
};

// تشغيل إذا كان ملف رئيسي
if (require.main === module) {
  runAllExamples().catch(console.error);
}
