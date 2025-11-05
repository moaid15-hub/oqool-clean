// cli-agent.ts
// ============================================
// 🎮 CLI مع Agent Loop
// ============================================

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { loadConfig } from './auth.js';
import { createAgentClient } from './agent-client.js';
import boxen from 'boxen';
import gradient from 'gradient-string';

const program = new Command();

// معلومات البرنامج
program.name('oqool').description('🧠 oqool - Agent Edition').version('4.0.0');

// ============================================
// 🚀 الأمر الرئيسي - Agent Mode
// ============================================
program
  .argument('[prompt]', 'ما تريد من Agent يسويه')
  .option('-d, --directory <path>', 'مجلد العمل', process.cwd())
  .action(async (prompt: string | undefined, options: any) => {
    try {
      // عرض Banner
      displayBanner();

      // تحميل API Key
      const config = await loadConfig();
      if (!config?.apiKey) {
        console.log(chalk.red('\n❌ لم تسجل الدخول!'));
        console.log(chalk.yellow('استخدم: oqool login <API_KEY>'));
        return;
      }

      // إنشاء Agent
      const agent = createAgentClient({
        apiKey: config.apiKey,
        workingDirectory: options.directory,
      });

      // إذا لم يكن هناك prompt - وضع تفاعلي
      if (!prompt) {
        await interactiveMode(agent);
        return;
      }

      // تنفيذ الـ prompt مباشرة
      const response = await agent.run(prompt);
      console.log('\n' + response);
    } catch (error: any) {
      console.error(chalk.red(`\n❌ خطأ: ${error.message}`));
      process.exit(1);
    }
  });

// ============================================
// 💬 الوضع التفاعلي
// ============================================
async function interactiveMode(agent: any): Promise<void> {
  console.log(chalk.cyan('\n💬 الوضع التفاعلي'));
  console.log(chalk.gray('اكتب "exit" للخروج\n'));

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.blue('أنت:'),
        prefix: '👤',
      },
    ]);

    if (!message.trim()) continue;

    if (message.toLowerCase() === 'exit') {
      console.log(chalk.yellow('\n👋 مع السلامة!'));
      break;
    }

    const response = await agent.chat(message);
    console.log(chalk.green('\n🤖 oqool:'));
    console.log(response + '\n');
  }
}

// ============================================
// 🎨 Banner
// ============================================
function displayBanner(): void {
  const title = gradient.pastel.multiline(
    [
      '╔══════════════════════════════════════════════════════════╗',
      '║                                                          ║',
      '║     🧠  Oqool - Agent Edition  🚀                    ║',
      '║                                                          ║',
      '║     Coding Agent مع أدوات حقيقية                        ║',
      '║     By: Oqool Team                                       ║',
      '║                                                          ║',
      '╚══════════════════════════════════════════════════════════╝',
    ].join('\n')
  );

  console.log('\n' + title + '\n');
}

// ============================================
// 🔑 أمر تسجيل الدخول
// ============================================
program
  .command('login <apiKey>')
  .description('تسجيل الدخول')
  .action(async (apiKey: string) => {
    const { saveConfig } = await import('./auth.js');
    await saveConfig({
      apiKey,
      apiUrl: 'https://api.anthropic.com',
    });
    console.log(chalk.green('✅ تم تسجيل الدخول بنجاح!'));
  });

// ============================================
// 📊 أمر الحالة
// ============================================
program
  .command('status')
  .description('عرض حالة الحساب')
  .action(async () => {
    const config = await loadConfig();

    if (!config?.apiKey) {
      console.log(chalk.red('❌ لم تسجل الدخول'));
      return;
    }

    console.log(
      boxen(
        chalk.green('✅ مسجل دخول\n') + chalk.gray(`API Key: ${config.apiKey.slice(0, 20)}...`),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'green',
        }
      )
    );
  });

// ============================================
// 🚪 أمر تسجيل الخروج
// ============================================
program
  .command('logout')
  .description('تسجيل الخروج')
  .action(async () => {
    const { logout } = await import('./auth.js');
    await logout();
    console.log(chalk.yellow('👋 تم تسجيل الخروج'));
  });

// تشغيل البرنامج
program.parse();
