// ml-cli.ts
// ============================================
// 🖥️ ML Agent CLI - واجهة سطر الأوامر لوكيل التعلم الآلي
// ============================================

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import Table from 'cli-table3';
import { EnhancedMLAgent, type MLTrainingResult } from '@oqool/shared/agents';
import { PatternAnalyzer, type PatternAnalysis } from '@oqool/shared/agents';
import { IntelligentPredictor, type PredictionResult } from '@oqool/shared/agents';
import type { CodeFile } from '@oqool/shared/core';

// ============================================
// 🎨 CLI Styling
// ============================================

const styles = {
  title: (text: string) => chalk.bold.cyan(text),
  success: (text: string) => chalk.green(text),
  error: (text: string) => chalk.red(text),
  warning: (text: string) => chalk.yellow(text),
  info: (text: string) => chalk.blue(text),
  dim: (text: string) => chalk.dim(text),
  highlight: (text: string) => chalk.bold.yellow(text),
};

// ============================================
// 🏗️ ML CLI Class
// ============================================

export class MLCLI {
  private mlAgent: EnhancedMLAgent | null = null;
  private predictor: IntelligentPredictor | null = null;
  private config: {
    deepseek?: string;
    claude?: string;
    openai?: string;
  };

  constructor() {
    this.config = this.loadConfig();
  }

  // ============================================
  // 📝 CLI Commands Setup
  // ============================================

  setupCommands(program: Command): void {
    const mlCommand = program.command('ml').description('🤖 نظام التعلم الآلي والتنبؤ بالكود');

    // Train command
    mlCommand
      .command('train')
      .description('🎓 تدريب النموذج على codebase')
      .option('-p, --path <path>', 'مسار المشروع', '.')
      .option('-d, --deep', 'تحليل عميق', false)
      .option('--parallel', 'معالجة موازية', false)
      .action((options) => this.trainCommand(options));

    // Predict command
    mlCommand
      .command('predict')
      .description('🔮 التنبؤ بإكمال الكود')
      .option('-f, --file <file>', 'الملف المراد التنبؤ له')
      .option('-l, --line <line>', 'رقم السطر')
      .option('-a, --aggressive', 'اقتراحات جريئة', false)
      .action((options) => this.predictCommand(options));

    // Analyze command
    mlCommand
      .command('analyze')
      .description('🔍 تحليل أنماط الكود')
      .option('-p, --path <path>', 'مسار المشروع', '.')
      .option('-o, --output <file>', 'حفظ التقرير في ملف')
      .action((options) => this.analyzeCommand(options));

    // Stats command
    mlCommand
      .command('stats')
      .description('📊 إحصائيات النموذج')
      .action(() => this.statsCommand());

    // Smells command
    mlCommand
      .command('smells')
      .description('👃 كشف روائح الكود')
      .option('-f, --file <file>', 'الملف المراد فحصه')
      .option('-p, --path <path>', 'مسار المشروع', '.')
      .action((options) => this.smellsCommand(options));

    // Interactive mode
    mlCommand
      .command('interactive')
      .alias('i')
      .description('💬 الوضع التفاعلي')
      .action(() => this.interactiveMode());

    // Clear memory
    mlCommand
      .command('clear')
      .description('🗑️ مسح ذاكرة النموذج')
      .action(() => this.clearCommand());

    // Export patterns
    mlCommand
      .command('export')
      .description('📤 تصدير الأنماط المتعلمة')
      .option('-o, --output <file>', 'ملف الإخراج', 'patterns.json')
      .action((options) => this.exportCommand(options));

    // Import patterns
    mlCommand
      .command('import')
      .description('📥 استيراد أنماط')
      .option('-i, --input <file>', 'ملف الإدخال', 'patterns.json')
      .action((options) => this.importCommand(options));
  }

  // ============================================
  // 🎓 Train Command
  // ============================================

  private async trainCommand(options: any): Promise<void> {
    const spinner = ora('جاري تحميل الملفات...').start();

    try {
      // Initialize ML Agent
      await this.initializeMLAgent();

      // Load codebase
      const projectPath = path.resolve(options.path);
      const files = await this.loadCodebase(projectPath);

      spinner.text = `تم العثور على ${files.length} ملف`;
      spinner.succeed();

      // Start training
      console.log('\n' + styles.title('🎓 بدء تدريب النموذج') + '\n' + styles.dim('━'.repeat(50)));

      const trainingSpinner = ora('جاري التدريب...').start();

      const result = await this.mlAgent!.trainOnCodePatterns(files, {
        deep: options.deep,
        parallel: options.parallel,
      });

      trainingSpinner.succeed('اكتمل التدريب!');

      // Display results
      this.displayTrainingResults(result);
    } catch (error: any) {
      spinner.fail('فشل التدريب');
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 🔮 Predict Command
  // ============================================

  private async predictCommand(options: any): Promise<void> {
    try {
      if (!options.file) {
        console.error(styles.error('❌ يجب تحديد الملف باستخدام -f'));
        return;
      }

      // Initialize predictor
      await this.initializePredictor();

      // Load file
      const filePath = path.resolve(options.file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const lines = fileContent.split('\n');

      const lineNumber = parseInt(options.line || lines.length);
      if (lineNumber > lines.length) {
        console.error(styles.error('❌ رقم السطر خارج النطاق'));
        return;
      }

      // Prepare context
      const context = {
        language: this.detectLanguage(filePath),
        currentFile: filePath,
        cursorPosition: { line: lineNumber, column: 0 },
        previousLines: lines.slice(Math.max(0, lineNumber - 10), lineNumber),
        currentLine: lines[lineNumber - 1] || '',
        nextLines: lines.slice(lineNumber, lineNumber + 5),
      };

      console.log(
        '\n' + styles.title('🔮 التنبؤ بإكمال الكود') + '\n' + styles.dim('━'.repeat(50))
      );

      const spinner = ora('جاري التنبؤ...').start();

      const result = await this.predictor!.predict(context, {
        aggressiveness: options.aggressive ? 'aggressive' : 'balanced',
        includeExplanations: true,
      });

      spinner.succeed('تم التنبؤ!');

      // Display results
      this.displayPredictionResults(result);
    } catch (error: any) {
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 🔍 Analyze Command
  // ============================================

  private async analyzeCommand(options: any): Promise<void> {
    const spinner = ora('جاري تحليل الكود...').start();

    try {
      const projectPath = path.resolve(options.path);
      const files = await this.loadCodebase(projectPath);

      spinner.text = `تحليل ${files.length} ملف...`;

      const analysis = await PatternAnalyzer.analyzeCodebase(files);

      spinner.succeed('اكتمل التحليل!');

      // Display results
      this.displayAnalysisResults(analysis);

      // Save to file if specified
      if (options.output) {
        await this.saveAnalysisReport(analysis, options.output);
        console.log(styles.success(`\n✅ تم حفظ التقرير في ${options.output}`));
      }
    } catch (error: any) {
      spinner.fail('فشل التحليل');
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 📊 Stats Command
  // ============================================

  private async statsCommand(): Promise<void> {
    try {
      await this.initializeMLAgent();
      const stats = this.mlAgent!.getStatistics();

      console.log(
        '\n' + styles.title('📊 إحصائيات نموذج التعلم الآلي') + '\n' + styles.dim('━'.repeat(50))
      );

      // Model info
      console.log(styles.info('\n🤖 معلومات النموذج:'));
      console.log(`   الاسم: ${stats.model.name}`);
      console.log(`   الإصدار: ${stats.model.version}`);
      console.log(`   الدقة: ${(stats.model.accuracy * 100).toFixed(1)}%`);

      // Training data
      console.log(styles.info('\n📚 بيانات التدريب:'));
      console.log(`   الملفات: ${stats.model.trainedOn.files}`);
      console.log(`   الأسطر: ${stats.model.trainedOn.lines.toLocaleString()}`);
      console.log(`   الأنماط: ${stats.model.trainedOn.patterns}`);
      console.log(`   اللغات: ${stats.model.trainedOn.languages.join(', ')}`);

      // Performance
      console.log(styles.info('\n⚡ الأداء:'));
      console.log(`   متوسط وقت التنبؤ: ${stats.model.performance.avgPredictionTime.toFixed(2)}ms`);
      console.log(`   معدل النجاح: ${(stats.model.performance.successRate * 100).toFixed(1)}%`);

      // Memory
      console.log(styles.info('\n💾 الذاكرة:'));
      console.log(`   الأنماط المحفوظة: ${stats.patterns}`);
      console.log(`   حجم الذاكرة المؤقتة: ${stats.cacheSize}`);
      console.log(`   إجمالي التنبؤات: ${stats.memory.totalPredictions}`);
      console.log(`   التنبؤات المقبولة: ${stats.memory.acceptedPredictions}`);
      console.log(`   معدل الثقة: ${(stats.memory.averageConfidence * 100).toFixed(1)}%`);
    } catch (error: any) {
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 👃 Code Smells Command
  // ============================================

  private async smellsCommand(options: any): Promise<void> {
    const spinner = ora('جاري فحص روائح الكود...').start();

    try {
      await this.initializeMLAgent();

      let files: CodeFile[];

      if (options.file) {
        // Single file
        const filePath = path.resolve(options.file);
        files = [await this.loadFile(filePath)];
      } else {
        // Whole project
        const projectPath = path.resolve(options.path);
        files = await this.loadCodebase(projectPath);
      }

      spinner.text = `فحص ${files.length} ملف...`;

      const allSmells = [];
      for (const file of files) {
        const smells = await this.mlAgent!.detectCodeSmells(file);
        if (smells.length > 0) {
          allSmells.push({ file: file.path, smells });
        }
      }

      spinner.succeed('اكتمل الفحص!');

      // Display results
      this.displayCodeSmells(allSmells);
    } catch (error: any) {
      spinner.fail('فشل الفحص');
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 💬 Interactive Mode
  // ============================================

  private async interactiveMode(): Promise<void> {
    console.log(
      '\n' +
        styles.title('💬 الوضع التفاعلي لنظام التعلم الآلي') +
        '\n' +
        styles.dim('━'.repeat(50)) +
        '\n'
    );

    await this.initializeMLAgent();
    await this.initializePredictor();

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'ماذا تريد أن تفعل؟',
          choices: [
            { name: '🎓 تدريب النموذج', value: 'train' },
            { name: '🔮 التنبؤ بالكود', value: 'predict' },
            { name: '🔍 تحليل الأنماط', value: 'analyze' },
            { name: '👃 كشف روائح الكود', value: 'smells' },
            { name: '📊 عرض الإحصائيات', value: 'stats' },
            { name: '🚪 خروج', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') {
        console.log(styles.success('\n👋 وداعاً!'));
        break;
      }

      switch (action) {
        case 'train':
          await this.interactiveTrain();
          break;
        case 'predict':
          await this.interactivePredict();
          break;
        case 'analyze':
          await this.interactiveAnalyze();
          break;
        case 'smells':
          await this.interactiveSmells();
          break;
        case 'stats':
          await this.statsCommand();
          break;
      }

      console.log(); // Empty line
    }
  }

  // ============================================
  // 🗑️ Clear Command
  // ============================================

  private async clearCommand(): Promise<void> {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'هل أنت متأكد من مسح جميع البيانات المتعلمة؟',
        default: false,
      },
    ]);

    if (confirm) {
      const cacheDir = '.oqool/ml-cache';
      if (await fs.pathExists(cacheDir)) {
        await fs.remove(cacheDir);
        console.log(styles.success('\n✅ تم مسح الذاكرة بنجاح'));
      } else {
        console.log(styles.info('\n📭 الذاكرة فارغة بالفعل'));
      }
    }
  }

  // ============================================
  // 📤 Export Command
  // ============================================

  private async exportCommand(options: any): Promise<void> {
    const spinner = ora('جاري تصدير الأنماط...').start();

    try {
      await this.initializeMLAgent();
      const stats = this.mlAgent!.getStatistics();

      const exportData = {
        model: stats.model,
        patterns: stats.patterns,
        exportedAt: new Date().toISOString(),
      };

      await fs.writeJSON(options.output, exportData, { spaces: 2 });

      spinner.succeed(`تم التصدير إلى ${options.output}`);
    } catch (error: any) {
      spinner.fail('فشل التصدير');
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 📥 Import Command
  // ============================================

  private async importCommand(options: any): Promise<void> {
    const spinner = ora('جاري استيراد الأنماط...').start();

    try {
      if (!(await fs.pathExists(options.input))) {
        throw new Error(`الملف ${options.input} غير موجود`);
      }

      const data = await fs.readJSON(options.input);
      spinner.succeed(`تم استيراد ${data.patterns} نمط بنجاح`);
    } catch (error: any) {
      spinner.fail('فشل الاستيراد');
      console.error(styles.error(`\n❌ خطأ: ${error.message}`));
    }
  }

  // ============================================
  // 🛠️ Helper Methods
  // ============================================

  private async initializeMLAgent(): Promise<void> {
    if (!this.mlAgent) {
      this.mlAgent = new EnhancedMLAgent(this.config);
    }
  }

  private async initializePredictor(): Promise<void> {
    if (!this.predictor) {
      this.predictor = new IntelligentPredictor(this.config);
    }
  }

  private loadConfig(): any {
    // Load from environment or config file
    return {
      deepseek: process.env.DEEPSEEK_API_KEY,
      claude: process.env.CLAUDE_API_KEY,
      openai: process.env.OPENAI_API_KEY,
    };
  }

  private async loadCodebase(projectPath: string): Promise<CodeFile[]> {
    const files: CodeFile[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go'];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else if (extensions.includes(path.extname(entry.name))) {
          files.push(await this.loadFile(fullPath));
        }
      }
    };

    await walk(projectPath);
    return files;
  }

  private async loadFile(filePath: string): Promise<CodeFile> {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      path: filePath,
      content,
      language: this.detectLanguage(filePath),
      lines: content.split('\n').length,
    };
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
    };
    return langMap[ext] || 'unknown';
  }

  // ============================================
  // 🖨️ Display Methods
  // ============================================

  private displayTrainingResults(result: MLTrainingResult): void {
    console.log('\n' + styles.success('✅ نتائج التدريب:'));
    console.log(styles.dim('━'.repeat(50)));

    const table = new Table({
      head: ['المقياس', 'القيمة'],
      colWidths: [30, 20],
    });

    table.push(
      ['الأنماط المتعلمة', result.patternsLearned.toString()],
      ['الدقة', `${(result.accuracy * 100).toFixed(1)}%`],
      ['إجمالي الملفات', result.stats.totalFiles.toString()],
      ['إجمالي الأسطر', result.stats.totalLines.toLocaleString()],
      ['اللغات', result.stats.languages.join(', ')],
      ['التعقيد', result.stats.complexity.toString()],
      ['المدة', `${(result.stats.duration / 1000).toFixed(2)}s`]
    );

    console.log(table.toString());

    if (result.improvements.length > 0) {
      console.log('\n' + styles.info('💡 اقتراحات التحسين:'));
      result.improvements.forEach((improvement: string) => {
        console.log(`   • ${improvement}`);
      });
    }
  }

  private displayPredictionResults(result: PredictionResult): void {
    console.log('\n' + styles.info(`🎯 الثقة: ${(result.confidence * 100).toFixed(1)}%`) + '\n');

    result.suggestions.forEach((suggestion: any, index: number) => {
      console.log(
        styles.highlight(`\n📝 الاقتراح ${index + 1}:`) +
          ` (ثقة: ${(suggestion.confidence * 100).toFixed(0)}%)`
      );
      console.log(styles.dim('─'.repeat(50)));
      console.log(suggestion.text);
      console.log(styles.dim(`\n💭 السبب: ${suggestion.reasoning}`));
    });

    if (result.alternatives.length > 0) {
      console.log('\n' + styles.info('🔄 بدائل محتملة:'));
      result.alternatives.forEach((alt: string) => {
        console.log(`   • ${alt}`);
      });
    }
  }

  private displayAnalysisResults(analysis: PatternAnalysis): void {
    console.log('\n' + styles.title('📊 نتائج التحليل:'));
    console.log(styles.dim('━'.repeat(50)));

    // Statistics
    console.log(styles.info('\n📈 الإحصائيات:'));
    console.log(`   إجمالي الأنماط: ${analysis.statistics.totalPatterns}`);
    console.log(`   متوسط التعقيد: ${analysis.statistics.complexity.avg.toFixed(1)}`);
    console.log(`   أفضل الممارسات: ${analysis.statistics.quality.bestPractices}`);
    console.log(`   الأنماط السيئة: ${analysis.statistics.quality.antiPatterns}`);

    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n' + styles.warning('⚠️ التوصيات:'));
      analysis.recommendations.forEach((rec: string) => {
        console.log(`   ${rec}`);
      });
    }

    // Insights
    if (analysis.insights.length > 0) {
      console.log('\n' + styles.success('✨ رؤى:'));
      analysis.insights.forEach((insight: string) => {
        console.log(`   ${insight}`);
      });
    }
  }

  private displayCodeSmells(smells: any[]): void {
    if (smells.length === 0) {
      console.log(styles.success('\n✅ لم يتم العثور على روائح كود!'));
      return;
    }

    console.log(
      '\n' + styles.warning(`👃 تم العثور على روائح كود في ${smells.length} ملف:`) + '\n'
    );

    smells.forEach(({ file, smells: fileSmells }) => {
      console.log(styles.info(`\n📄 ${file}:`));
      fileSmells.forEach((smell: string) => {
        console.log(`   • ${smell}`);
      });
    });
  }

  private async saveAnalysisReport(analysis: PatternAnalysis, outputFile: string): Promise<void> {
    await fs.writeJSON(outputFile, analysis, { spaces: 2 });
  }

  // Interactive helpers
  private async interactiveTrain(): Promise<void> {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'مسار المشروع:',
        default: '.',
      },
    ]);

    await this.trainCommand({ path, deep: false, parallel: false });
  }

  private async interactivePredict(): Promise<void> {
    const { file, line } = await inquirer.prompt([
      {
        type: 'input',
        name: 'file',
        message: 'الملف:',
      },
      {
        type: 'input',
        name: 'line',
        message: 'رقم السطر (اختياري):',
      },
    ]);

    await this.predictCommand({ file, line });
  }

  private async interactiveAnalyze(): Promise<void> {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'مسار المشروع:',
        default: '.',
      },
    ]);

    await this.analyzeCommand({ path });
  }

  private async interactiveSmells(): Promise<void> {
    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'مسار المشروع:',
        default: '.',
      },
    ]);

    await this.smellsCommand({ path });
  }
}

// ============================================
// Export
// ============================================

export function createMLCLI(): MLCLI {
  return new MLCLI();
}
