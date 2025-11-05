// ui.ts - نظام إخراج احترافي موحد
// ============================================
// 🎨 Unified Professional UI System
// ============================================

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import figures from 'figures';
import gradient from 'gradient-string';
import { createInterface } from 'readline';

// ============================================
// Types & Interfaces
// ============================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';
export type SpinnerType = 'dots' | 'line' | 'circle' | 'arrow';

export interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message?: string;
  duration?: number;
}

export interface FileChange {
  type: 'create' | 'modify' | 'delete';
  path: string;
  lines?: number;
}

export interface SummaryStats {
  label: string;
  value: string | number;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan';
}

// ============================================
// Core UI Class
// ============================================

export class UI {
  private spinner: Ora | null = null;
  private startTime: number = 0;
  private verbose: boolean = false;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose || false;
  }

  // ============================================
  // Branding & Headers
  // ============================================

  printBanner(): void {
    const banner = `
 ██████╗  ██████╗  ██████╗  ██████╗ ██╗     
██╔═══██╗██╔═══██╗██╔═══██╗██╔═══██╗██║     
██║   ██║██║   ██║██║   ██║██║   ██║██║     
██║   ██║██║▄▄ ██║██║   ██║██║   ██║██║     
╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝███████╗
 ╚═════╝  ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚══════╝
    `;

    console.log(gradient.pastel.multiline(banner));
    console.log(chalk.gray('         AI-Powered Arabic-First IDE\n'));
  }

  printHeader(title: string, subtitle?: string): void {
    console.log('\n' + boxen(
      chalk.bold.cyan(title) + (subtitle ? '\n' + chalk.gray(subtitle) : ''),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: 'cyan',
        dimBorder: true
      }
    ));
  }

  printSection(title: string): void {
    console.log('\n' + chalk.bold.cyan('━'.repeat(50)));
    console.log(chalk.bold.white(`  ${title}`));
    console.log(chalk.bold.cyan('━'.repeat(50)) + '\n');
  }

  // ============================================
  // Logging System
  // ============================================

  log(message: string, level: LogLevel = 'info'): void {
    const icons = {
      info: chalk.blue(figures.info),
      success: chalk.green(figures.tick),
      warning: chalk.yellow(figures.warning),
      error: chalk.red(figures.cross),
      debug: chalk.gray(figures.pointer)
    };

    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      debug: chalk.gray
    };

    if (level === 'debug' && !this.verbose) return;

    console.log(`${icons[level]} ${colors[level](message)}`);
  }

  info(message: string): void {
    this.log(message, 'info');
  }

  success(message: string): void {
    this.log(message, 'success');
  }

  warning(message: string): void {
    this.log(message, 'warning');
  }

  error(message: string): void {
    this.log(message, 'error');
  }

  debug(message: string): void {
    this.log(message, 'debug');
  }

  // ============================================
  // Spinner System
  // ============================================

  startSpinner(text: string, type: SpinnerType = 'dots'): void {
    this.startTime = Date.now();
    this.spinner = ora({
      text: chalk.cyan(text),
      spinner: type,
      color: 'cyan'
    }).start();
  }

  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = chalk.cyan(text);
    }
  }

  succeedSpinner(text?: string): void {
    if (this.spinner) {
      const duration = Date.now() - this.startTime;
      const finalText = text || this.spinner.text;
      this.spinner.succeed(
        chalk.green(finalText) + chalk.gray(` (${(duration / 1000).toFixed(1)}s)`)
      );
      this.spinner = null;
    }
  }

  failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(chalk.red(text || this.spinner.text));
      this.spinner = null;
    }
  }

  warnSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.warn(chalk.yellow(text || this.spinner.text));
      this.spinner = null;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  // ============================================
  // Progress & Steps
  // ============================================

  async runSteps(
    steps: Array<{
      name: string;
      action: () => Promise<any>;
      optional?: boolean;
    }>
  ): Promise<void> {
    console.log(chalk.cyan(`\n🚀 Executing ${steps.length} steps...\n`));

    const results: ProgressStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNum = `[${i + 1}/${steps.length}]`;

      this.startSpinner(`${stepNum} ${step.name}...`);

      const startTime = Date.now();

      try {
        await step.action();
        const duration = Date.now() - startTime;

        results.push({
          name: step.name,
          status: 'success',
          duration
        });

        this.succeedSpinner(`${stepNum} ${chalk.green(figures.tick)} ${step.name}`);
      } catch (error) {
        const duration = Date.now() - startTime;

        if (step.optional) {
          results.push({
            name: step.name,
            status: 'skipped',
            message: 'Optional step failed',
            duration
          });
          this.warnSpinner(`${stepNum} ${chalk.yellow(figures.warning)} ${step.name} (skipped)`);
        } else {
          results.push({
            name: step.name,
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
            duration
          });
          this.failSpinner(`${stepNum} ${chalk.red(figures.cross)} ${step.name}`);
          throw error;
        }
      }
    }

    // Summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    console.log(chalk.cyan('\n━'.repeat(50)));
    console.log(chalk.green(`✓ Successful: ${successful}/${steps.length}`));
    if (skipped > 0) console.log(chalk.yellow(`⚠ Skipped: ${skipped}`));
    if (failed > 0) console.log(chalk.red(`✗ Failed: ${failed}`));
    console.log(chalk.cyan('━'.repeat(50) + '\n'));
  }

  printProgress(current: number, total: number, label?: string): void {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;

    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const text = label ? ` ${label}` : '';

    process.stdout.write(`\r${bar} ${percentage}%${text}`);

    if (current === total) {
      console.log(''); // New line when complete
    }
  }

  // ============================================
  // Lists & Tables
  // ============================================

  printList(
    items: string[],
    options: { bullet?: string; indent?: number; color?: string } = {}
  ): void {
    const { bullet = '•', indent = 2, color = 'white' } = options;
    const colorFn = (chalk as any)[color] || chalk.white;

    items.forEach(item => {
      console.log(
        ' '.repeat(indent) + chalk.cyan(bullet) + ' ' + colorFn(item)
      );
    });
  }

  printNumberedList(items: string[], options: { indent?: number; color?: string } = {}): void {
    const { indent = 2, color = 'white' } = options;
    const colorFn = (chalk as any)[color] || chalk.white;

    items.forEach((item, index) => {
      console.log(
        ' '.repeat(indent) + chalk.cyan(`${index + 1}.`) + ' ' + colorFn(item)
      );
    });
  }

  printTable(data: Array<Record<string, any>>, columns: string[]): void {
    const table = new Table({
      head: columns.map(col => chalk.cyan(col)),
      style: {
        head: [],
        border: ['gray']
      },
      colWidths: columns.map(() => 30)
    });

    data.forEach(row => {
      table.push(columns.map(col => String(row[col] || '')));
    });

    console.log('\n' + table.toString() + '\n');
  }

  printKeyValue(data: Record<string, any>, options: { indent?: number } = {}): void {
    const { indent = 2 } = options;
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

    Object.entries(data).forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(
        ' '.repeat(indent) +
        chalk.cyan(paddedKey) + chalk.gray(': ') +
        chalk.white(String(value))
      );
    });
  }

  // ============================================
  // File Changes Display
  // ============================================

  printFileChanges(changes: FileChange[]): void {
    console.log(chalk.cyan('\n📝 File Changes:\n'));

    const created = changes.filter(c => c.type === 'create');
    const modified = changes.filter(c => c.type === 'modify');
    const deleted = changes.filter(c => c.type === 'delete');

    if (created.length > 0) {
      console.log(chalk.green('  Created:'));
      created.forEach(c => {
        const lines = c.lines ? chalk.gray(` (${c.lines} lines)`) : '';
        console.log(`    ${chalk.green('+')} ${c.path}${lines}`);
      });
    }

    if (modified.length > 0) {
      console.log(chalk.blue('\n  Modified:'));
      modified.forEach(c => {
        const lines = c.lines ? chalk.gray(` (${c.lines} lines)`) : '';
        console.log(`    ${chalk.blue('~')} ${c.path}${lines}`);
      });
    }

    if (deleted.length > 0) {
      console.log(chalk.red('\n  Deleted:'));
      deleted.forEach(c => {
        console.log(`    ${chalk.red('-')} ${c.path}`);
      });
    }

    console.log('');
  }

  printDiff(oldContent: string, newContent: string, filename?: string): void {
    const diff = require('diff');
    
    if (filename) {
      console.log(chalk.cyan(`\n📄 ${filename}:\n`));
    }

    const changes = diff.createPatch('file', oldContent, newContent);
    const lines = changes.split('\n').slice(4); // Skip header

    lines.forEach((line: string) => {
      if (line.startsWith('+')) {
        console.log(chalk.green(line));
      } else if (line.startsWith('-')) {
        console.log(chalk.red(line));
      } else if (line.startsWith('@@')) {
        console.log(chalk.cyan(line));
      } else {
        console.log(chalk.gray(line));
      }
    });

    console.log('');
  }

  // ============================================
  // Summary & Stats
  // ============================================

  printSummary(title: string, stats: SummaryStats[]): void {
    console.log(chalk.cyan('\n' + '━'.repeat(50)));
    console.log(chalk.bold.white(`  ${title}`));
    console.log(chalk.cyan('━'.repeat(50)));

    const maxLabelLength = Math.max(...stats.map(s => s.label.length));

    stats.forEach(stat => {
      const paddedLabel = stat.label.padEnd(maxLabelLength);
      const colorFn = stat.color ? (chalk as any)[stat.color] : chalk.white;
      console.log(
        '  ' + chalk.gray(paddedLabel) + chalk.gray(': ') + colorFn(stat.value)
      );
    });

    console.log(chalk.cyan('━'.repeat(50) + '\n'));
  }

  printStats(stats: Record<string, number | string>): void {
    console.log(chalk.cyan('\n📊 Statistics:\n'));

    Object.entries(stats).forEach(([key, value]) => {
      const icon = typeof value === 'number' && value > 0 ? '✓' : '○';
      console.log(`  ${chalk.gray(icon)} ${chalk.white(key)}: ${chalk.cyan(value)}`);
    });

    console.log('');
  }

  // ============================================
  // Boxes & Alerts
  // ============================================

  printBox(content: string, options: {
    title?: string;
    color?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan';
    padding?: number;
  } = {}): void {
    const { title, color = 'cyan', padding = 1 } = options;

    console.log('\n' + boxen(
      (title ? chalk.bold(title) + '\n\n' : '') + content,
      {
        padding,
        borderStyle: 'round',
        borderColor: color,
        dimBorder: false
      }
    ) + '\n');
  }

  printSuccess(message: string, details?: string): void {
    this.printBox(
      chalk.green(message) + (details ? '\n\n' + chalk.gray(details) : ''),
      { title: '✓ Success', color: 'green' }
    );
  }

  printError(message: string, details?: string): void {
    this.printBox(
      chalk.red(message) + (details ? '\n\n' + chalk.gray(details) : ''),
      { title: '✗ Error', color: 'red' }
    );
  }

  printWarning(message: string, details?: string): void {
    this.printBox(
      chalk.yellow(message) + (details ? '\n\n' + chalk.gray(details) : ''),
      { title: '⚠ Warning', color: 'yellow' }
    );
  }

  printInfo(message: string, details?: string): void {
    this.printBox(
      chalk.blue(message) + (details ? '\n\n' + chalk.gray(details) : ''),
      { title: 'ℹ Info', color: 'blue' }
    );
  }

  // ============================================
  // Code Display
  // ============================================

  printCode(code: string, language?: string): void {
    const highlightedCode = this.highlightCode(code, language);
    console.log(chalk.gray('\n┌─ Code ') + chalk.gray('─'.repeat(43)));
    console.log(chalk.gray('│'));
    highlightedCode.split('\n').forEach(line => {
      console.log(chalk.gray('│ ') + line);
    });
    console.log(chalk.gray('│'));
    console.log(chalk.gray('└') + chalk.gray('─'.repeat(49)) + '\n');
  }

  private highlightCode(code: string, language?: string): string {
    // Basic syntax highlighting
    const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while'];
    
    return code.split('\n').map(line => {
      let highlighted = line;
      
      // Keywords
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        highlighted = highlighted.replace(regex, chalk.magenta(keyword));
      });
      
      // Strings
      highlighted = highlighted.replace(/(["'`])(.*?)\1/g, (match) => chalk.green(match));
      
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$)/g, (match) => chalk.gray(match));
      
      return highlighted;
    }).join('\n');
  }

  // ============================================
  // Interactive Prompts
  // ============================================

  async confirm(message: string, defaultValue: boolean = true): Promise<boolean> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      const prompt = defaultValue ? '[Y/n]' : '[y/N]';
      rl.question(chalk.cyan(`? ${message} ${chalk.gray(prompt)} `), answer => {
        rl.close();
        
        if (!answer) {
          resolve(defaultValue);
        } else {
          resolve(['y', 'yes'].includes(answer.toLowerCase()));
        }
      });
    });
  }

  async input(message: string, defaultValue?: string): Promise<string> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      const prompt = defaultValue ? chalk.gray(`(${defaultValue})`) : '';
      rl.question(chalk.cyan(`? ${message} ${prompt} `), answer => {
        rl.close();
        resolve(answer || defaultValue || '');
      });
    });
  }

  // ============================================
  // Helpers & Utilities
  // ============================================

  clearScreen(): void {
    console.clear();
  }

  newLine(count: number = 1): void {
    console.log('\n'.repeat(count - 1));
  }

  printSeparator(char: string = '─', length: number = 50): void {
    console.log(chalk.gray(char.repeat(length)));
  }

  printEmptyLine(): void {
    console.log('');
  }

  // ============================================
  // Tips & Suggestions
  // ============================================

  printTip(message: string): void {
    console.log(chalk.yellow(`\n💡 Tip: `) + chalk.white(message) + '\n');
  }

  printNextSteps(steps: string[]): void {
    console.log(chalk.cyan('\n🎯 Next Steps:\n'));
    steps.forEach((step, index) => {
      console.log(`  ${chalk.cyan(`${index + 1}.`)} ${chalk.white(step)}`);
    });
    console.log('');
  }

  printCommand(command: string, description?: string): void {
    const cmd = chalk.cyan(command);
    const desc = description ? chalk.gray(` - ${description}`) : '';
    console.log(`  ${cmd}${desc}`);
  }

  // ============================================
  // Time Display
  // ============================================

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

let uiInstance: UI | null = null;

export function getUI(options?: { verbose?: boolean }): UI {
  if (!uiInstance) {
    uiInstance = new UI(options);
  }
  return uiInstance;
}

export const ui = getUI();

// ============================================
// Convenience Exports
// ============================================

export default ui;
