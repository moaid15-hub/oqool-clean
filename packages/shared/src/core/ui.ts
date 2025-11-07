// ui.ts - نظام إخراج احترافي متطور
// ============================================
// 🎨 Enhanced Professional UI System
// ============================================

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import figures from 'figures';
import gradient from 'gradient-string';
import { createInterface } from 'readline';
import fs from 'fs';
import path from 'path';

// ============================================
// Types & Interfaces
// ============================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug' | 'critical';
export type SpinnerType = 'dots' | 'line' | 'circle' | 'arrow' | 'clock';
export type Theme = 'default' | 'dark' | 'light' | 'professional' | 'minimal';

export interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped' | 'warning';
  message?: string;
  duration?: number;
  progress?: number; // 0-100
}

export interface UIFileChange {
  type: 'create' | 'modify' | 'delete' | 'rename' | 'copy';
  path: string;
  newPath?: string; // for rename/copy
  lines?: number;
  size?: string;
}

export interface SummaryStats {
  label: string;
  value: string | number;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'cyan' | 'magenta';
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface UIConfig {
  theme: Theme;
  verbose: boolean;
  animations: boolean;
  language: 'ar' | 'en';
  colors: boolean;
  timestamp: boolean;
  logToFile: boolean;
  logFile?: string;
}

// ============================================
// Theme System
// ============================================

const THEMES = {
  default: {
    primary: 'cyan',
    secondary: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    accent: 'magenta'
  },
  dark: {
    primary: 'white',
    secondary: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    accent: 'magenta'
  },
  light: {
    primary: 'blue',
    secondary: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    accent: 'magenta'
  },
  professional: {
    primary: 'blue',
    secondary: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'white',
    accent: 'magenta'
  },
  minimal: {
    primary: 'gray',
    secondary: 'gray',
    success: 'gray',
    warning: 'gray',
    error: 'gray',
    info: 'gray',
    accent: 'gray'
  }
};

// ============================================
// Core UI Class
// ============================================

export class UI {
  private spinner: Ora | null = null;
  private startTime: number = 0;
  private config: UIConfig;
  private logStream: fs.WriteStream | null = null;
  private progressBars: Map<string, { current: number; total: number; label: string }> = new Map();
  private sessionId: string = Date.now().toString();

  constructor(options: Partial<UIConfig> = {}) {
    this.config = {
      theme: 'default',
      verbose: false,
      animations: true,
      language: 'en',
      colors: true,
      timestamp: true,
      logToFile: false,
      ...options
    };

    if (this.config.logToFile) {
      this.setupLogging();
    }
  }

  // ============================================
  // Configuration Management
  // ============================================

  updateConfig(newConfig: Partial<UIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.logToFile && !this.logStream) {
      this.setupLogging();
    } else if (!this.config.logToFile && this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

  getConfig(): UIConfig {
    return { ...this.config };
  }

  private setupLogging(): void {
    const logFile = this.config.logFile || `ui-${this.sessionId}.log`;
    try {
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
      this.logStream.write(`\n=== Session Started: ${new Date().toISOString()} ===\n`);
    } catch (error) {
      this.error(`Failed to setup logging: ${error}`);
    }
  }

  private logToFile(level: string, message: string): void {
    if (this.logStream) {
      const timestamp = new Date().toISOString();
      this.logStream.write(`[${timestamp}] [${level}] ${message}\n`);
    }
  }

  // ============================================
  // Branding & Headers
  // ============================================

  printBanner(version?: string): void {
    const banner = `
 ██████╗  ██████╗  ██████╗  ██████╗ ██╗     
██╔═══██╗██╔═══██╗██╔═══██╗██╔═══██╗██║     
██║   ██║██║   ██║██║   ██║██║   ██║██║     
██║   ██║██║▄▄ ██║██║   ██║██║   ██║██║     
╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝███████╗
 ╚═════╝  ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚══════╝
    `;

    console.log(gradient.pastel.multiline(banner));
    
    const subtitle = version 
      ? `AI-Powered Arabic-First IDE v${version}`
      : 'AI-Powered Arabic-First IDE';
    
    console.log(chalk.gray(`         ${subtitle}\n`));
    
    if (this.config.timestamp) {
      console.log(chalk.gray(`    Started at: ${this.formatTime()}\n`));
    }
  }

  printHeader(title: string, subtitle?: string, options: { emoji?: string; color?: string } = {}): void {
    const { emoji, color = 'primary' } = options;
    const theme = THEMES[this.config.theme];
    const colorFn = (chalk as any)[theme[color as keyof typeof theme]] || chalk.cyan;
    
    const headerContent = 
      (emoji ? `${emoji} ` : '') + 
      chalk.bold(colorFn(title)) + 
      (subtitle ? '\n' + chalk.gray(subtitle) : '');

    console.log('\n' + boxen(
      headerContent,
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: 'round',
        borderColor: theme.primary,
        dimBorder: true
      }
    ));
  }

  printSection(title: string, options: { emoji?: string; level?: 1 | 2 | 3 } = {}): void {
    const { emoji, level = 1 } = options;
    const theme = THEMES[this.config.theme];
    const colors = [theme.primary, theme.secondary, theme.info];
    const color = colors[level - 1] || theme.primary;
    const colorFn = (chalk as any)[color] || chalk.cyan;
    
    const separator = '━'.repeat(50);
    const titleContent = (emoji ? `${emoji} ` : '') + title;

    console.log('\n' + colorFn('━'.repeat(50)));
    console.log(chalk.bold.white(`  ${titleContent}`));
    console.log(colorFn('━'.repeat(50)) + '\n');
  }

  // ============================================
  // Enhanced Logging System
  // ============================================

  log(message: string, level: LogLevel = 'info', context?: string): void {
    const icons = {
      info: chalk.blue(figures.info),
      success: chalk.green(figures.tick),
      warning: chalk.yellow(figures.warning),
      error: chalk.red(figures.cross),
      debug: chalk.gray(figures.pointer),
      critical: chalk.red('💥')
    };

    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      debug: chalk.gray,
      critical: chalk.red.bold
    };

    if ((level === 'debug' || level === 'critical') && !this.config.verbose) return;

    const timestamp = this.config.timestamp ? chalk.gray(`[${this.formatTime()}] `) : '';
    const contextPart = context ? chalk.gray(`[${context}] `) : '';
    
    const logMessage = `${timestamp}${icons[level]} ${contextPart}${colors[level](message)}`;
    
    console.log(logMessage);
    this.logToFile(level.toUpperCase(), message);
  }

  info(message: string, context?: string): void {
    this.log(message, 'info', context);
  }

  success(message: string, context?: string): void {
    this.log(message, 'success', context);
  }

  warning(message: string, context?: string): void {
    this.log(message, 'warning', context);
  }

  error(message: string, context?: string): void {
    this.log(message, 'error', context);
  }

  debug(message: string, context?: string): void {
    this.log(message, 'debug', context);
  }

  critical(message: string, context?: string): void {
    this.log(message, 'critical', context);
  }

  // ============================================
  // Advanced Spinner System
  // ============================================

  startSpinner(text: string, type: SpinnerType = 'dots', options: { 
    color?: string; 
    persistent?: boolean;
  } = {}): void {
    if (!this.config.animations) {
      console.log(chalk.cyan(`⏳ ${text}`));
      return;
    }

    this.startTime = Date.now();
    this.spinner = ora({
      text: chalk.cyan(text),
      spinner: type as any,
      color: (options.color || 'cyan') as any,
      ...(options.persistent && { hideCursor: false })
    }).start();
  }

  updateSpinner(text: string, options: { progress?: number } = {}): void {
    if (this.spinner) {
      const progressText = options.progress ? ` [${options.progress}%]` : '';
      this.spinner.text = chalk.cyan(text + progressText);
    }
  }

  succeedSpinner(text?: string, options: { persistent?: boolean } = {}): void {
    if (this.spinner) {
      const duration = Date.now() - this.startTime;
      const finalText = text || this.spinner.text;
      const resultText = chalk.green(finalText) + chalk.gray(` (${this.formatDuration(duration)})`);
      
      if (options.persistent) {
        this.spinner.stopAndPersist({ symbol: chalk.green('✓'), text: resultText });
      } else {
        this.spinner.succeed(resultText);
      }
      this.spinner = null;
    }
  }

  failSpinner(text?: string, options: { persistent?: boolean } = {}): void {
    if (this.spinner) {
      const resultText = chalk.red(text || this.spinner.text);
      
      if (options.persistent) {
        this.spinner.stopAndPersist({ symbol: chalk.red('✗'), text: resultText });
      } else {
        this.spinner.fail(resultText);
      }
      this.spinner = null;
    }
  }

  warnSpinner(text?: string, options: { persistent?: boolean } = {}): void {
    if (this.spinner) {
      const resultText = chalk.yellow(text || this.spinner.text);
      
      if (options.persistent) {
        this.spinner.stopAndPersist({ symbol: chalk.yellow('⚠'), text: resultText });
      } else {
        this.spinner.warn(resultText);
      }
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
  // Advanced Progress & Steps
  // ============================================

  async runSteps(
    steps: Array<{
      name: string;
      action: (progress: (percent: number) => void) => Promise<any>;
      optional?: boolean;
      retries?: number;
    }>,
    options: { parallel?: boolean; continueOnError?: boolean } = {}
  ): Promise<{ success: number; failed: number; skipped: number }> {
    console.log(chalk.cyan(`\n🚀 Executing ${steps.length} steps...\n`));

    const results: ProgressStep[] = [];

    if (options.parallel) {
      // Parallel execution
      const promises = steps.map(async (step, index) => {
        const stepNum = `[${index + 1}/${steps.length}]`;
        return this.executeStep(step, stepNum, results);
      });

      await Promise.all(promises);
    } else {
      // Sequential execution
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNum = `[${i + 1}/${steps.length}]`;
        
        await this.executeStep(step, stepNum, results);
        
        // Stop if step failed and continueOnError is false
        const lastResult = results[results.length - 1];
        if (lastResult.status === 'error' && !options.continueOnError) {
          break;
        }
      }
    }

    return this.printStepSummary(results, steps.length);
  }

  private async executeStep(
    step: { name: string; action: (progress: (percent: number) => void) => Promise<any>; optional?: boolean; retries?: number },
    stepNum: string,
    results: ProgressStep[]
  ): Promise<void> {
    let retries = step.retries || 0;
    let attempt = 0;

    const progressCallback = (percent: number) => {
      this.updateSpinner(`${stepNum} ${step.name}...`, { progress: percent });
    };

    while (attempt <= retries) {
      attempt++;
      
      this.startSpinner(`${stepNum} ${step.name}...${attempt > 1 ? ` (attempt ${attempt})` : ''}`);

      const startTime = Date.now();

      try {
        await step.action(progressCallback);
        const duration = Date.now() - startTime;

        results.push({
          name: step.name,
          status: 'success',
          duration
        });

        this.succeedSpinner(`${stepNum} ${chalk.green(figures.tick)} ${step.name}`);
        break; // Success, break retry loop
      } catch (error) {
        const duration = Date.now() - startTime;

        if (attempt > retries) {
          // Final attempt failed
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
          }
        } else {
          // Retry
          this.warnSpinner(`${stepNum} ${chalk.yellow('⟳')} ${step.name} (retrying...)`);
        }
      }
    }
  }

  private printStepSummary(results: ProgressStep[], totalSteps: number): { success: number; failed: number; skipped: number } {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const warning = results.filter(r => r.status === 'warning').length;

    const separator = chalk.cyan('━'.repeat(50));
    
    console.log(separator);
    console.log(chalk.green(`✓ Successful: ${successful}/${totalSteps}`));
    if (warning > 0) console.log(chalk.yellow(`⚠ Warnings: ${warning}`));
    if (skipped > 0) console.log(chalk.yellow(`⏭ Skipped: ${skipped}`));
    if (failed > 0) console.log(chalk.red(`✗ Failed: ${failed}`));
    
    // Print durations for successful steps
    const successfulSteps = results.filter(r => r.status === 'success');
    if (successfulSteps.length > 0) {
      const totalDuration = successfulSteps.reduce((sum, step) => sum + (step.duration || 0), 0);
      console.log(chalk.blue(`⏱ Total time: ${this.formatDuration(totalDuration)}`));
    }
    
    console.log(separator + '\n');

    return { success: successful, failed, skipped };
  }

  createProgressBar(id: string, total: number, label: string): void {
    this.progressBars.set(id, { current: 0, total, label });
    this.renderProgressBars();
  }

  updateProgressBar(id: string, current: number, label?: string): void {
    const bar = this.progressBars.get(id);
    if (bar) {
      bar.current = current;
      if (label) bar.label = label;
      this.renderProgressBars();
    }
  }

  removeProgressBar(id: string): void {
    this.progressBars.delete(id);
    this.renderProgressBars();
  }

  private renderProgressBars(): void {
    if (this.progressBars.size === 0) return;

    // Move cursor up to overwrite previous progress bars
    process.stdout.write('\x1B[' + this.progressBars.size + 'A');

    this.progressBars.forEach((bar, id) => {
      const percentage = Math.floor((bar.current / bar.total) * 100);
      const filled = Math.floor(percentage / 2);
      const empty = 50 - filled;

      const progressBar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
      const text = ` ${bar.label}`;

      process.stdout.write(`\r${progressBar} ${percentage}%${text}\n`);
    });
  }

  // ============================================
  // Enhanced Lists & Tables
  // ============================================

  printList(
    items: string[],
    options: { 
      bullet?: string; 
      indent?: number; 
      color?: string;
      numbered?: boolean;
      maxItems?: number;
    } = {}
  ): void {
    const { bullet = '•', indent = 2, color = 'white', numbered = false, maxItems } = options;
    const colorFn = (chalk as any)[color] || chalk.white;

    const itemsToShow = maxItems ? items.slice(0, maxItems) : items;
    const hasMore = maxItems && items.length > maxItems;

    itemsToShow.forEach((item, index) => {
      const prefix = numbered 
        ? chalk.cyan(`${index + 1}.`) 
        : chalk.cyan(bullet);
      
      console.log(
        ' '.repeat(indent) + prefix + ' ' + colorFn(item)
      );
    });

    if (hasMore) {
      console.log(
        ' '.repeat(indent) + chalk.gray(`... and ${items.length - maxItems} more`)
      );
    }
  }

  printTable(
    data: Array<Record<string, any>>, 
    columns: Array<{ key: string; label: string; width?: number; color?: (value: any) => string }>,
    options: { title?: string; compact?: boolean } = {}
  ): void {
    const table = new Table({
      head: columns.map(col => chalk.cyan(col.label)),
      style: {
        head: [],
        border: ['gray'],
        ...(options.compact && { 'padding-left': 1, 'padding-right': 1 })
      },
      colWidths: columns.map(col => col.width || 20),
      ...(options.compact && { chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' } })
    });

    data.forEach(row => {
      table.push(columns.map(col => {
        const value = String(row[col.key] || '');
        return col.color ? col.color(value) : value;
      }));
    });

    if (options.title) {
      console.log(chalk.cyan(`\n${options.title}:`));
    }
    
    console.log('\n' + table.toString() + '\n');
  }

  printTree(
    root: string,
    children: Record<string, string[]>,
    options: { indent?: number; color?: string } = {}
  ): void {
    const { indent = 2, color = 'white' } = options;
    const colorFn = (chalk as any)[color] || chalk.white;

    const printNode = (node: string, level: number, isLast: boolean) => {
      const prefix = level === 0 ? '' : ' '.repeat(level * indent - indent) + (isLast ? '└── ' : '├── ');
      console.log(prefix + colorFn(node));
      
      const nodeChildren = children[node] || [];
      nodeChildren.forEach((child, index) => {
        const isLastChild = index === nodeChildren.length - 1;
        printNode(child, level + 1, isLastChild);
      });
    };

    printNode(root, 0, true);
  }

  // ============================================
  // Enhanced File Changes Display
  // ============================================

  printUIFileChanges(changes: UIFileChange[], options: { showSummary?: boolean; groupByType?: boolean } = {}): void {
    const { showSummary = true, groupByType = true } = options;
    
    console.log(chalk.cyan('\n📝 File Changes:\n'));

    if (groupByType) {
      const created = changes.filter(c => c.type === 'create');
      const modified = changes.filter(c => c.type === 'modify');
      const deleted = changes.filter(c => c.type === 'delete');
      const renamed = changes.filter(c => c.type === 'rename');
      const copied = changes.filter(c => c.type === 'copy');

      this.printUIFileChangeGroup('Created', created, chalk.green, '+');
      this.printUIFileChangeGroup('Modified', modified, chalk.blue, '~');
      this.printUIFileChangeGroup('Deleted', deleted, chalk.red, '-');
      this.printUIFileChangeGroup('Renamed', renamed, chalk.yellow, '→');
      this.printUIFileChangeGroup('Copied', copied, chalk.magenta, '⧉');
    } else {
      changes.forEach(change => {
        this.printUIFileChange(change);
      });
    }

    if (showSummary) {
      const stats = {
        'Total Changes': changes.length,
        'Files Created': changes.filter(c => c.type === 'create').length,
        'Files Modified': changes.filter(c => c.type === 'modify').length,
        'Files Deleted': changes.filter(c => c.type === 'delete').length,
      };
      
      this.printStats(stats);
    }
  }

  private printUIFileChangeGroup(
    title: string, 
    changes: UIFileChange[], 
    color: typeof chalk, 
    symbol: string
  ): void {
    if (changes.length > 0) {
      console.log(color(`  ${title} (${changes.length}):`));
      changes.forEach(change => {
        this.printUIFileChange(change, color, symbol);
      });
      console.log('');
    }
  }

  private printUIFileChange(change: UIFileChange, color?: typeof chalk, customSymbol?: string): void {
    const symbols = {
      create: { symbol: '+', color: chalk.green },
      modify: { symbol: '~', color: chalk.blue },
      delete: { symbol: '-', color: chalk.red },
      rename: { symbol: '→', color: chalk.yellow },
      copy: { symbol: '⧉', color: chalk.magenta }
    };

    const config = symbols[change.type] || { symbol: '?', color: chalk.gray };
    const symbol = customSymbol || config.symbol;
    const colorFn = color || config.color;

    let changeText = `    ${colorFn(symbol)} ${change.path}`;
    
    if (change.newPath) {
      changeText += colorFn(` → ${change.newPath}`);
    }
    
    if (change.lines) {
      changeText += chalk.gray(` (${change.lines} lines)`);
    }
    
    if (change.size) {
      changeText += chalk.gray(` [${change.size}]`);
    }

    console.log(changeText);
  }

  // ============================================
  // Advanced Summary & Stats
  // ============================================

  printSummary(title: string, stats: SummaryStats[], options: { 
    showIcons?: boolean; 
    compact?: boolean;
    align?: 'left' | 'right';
  } = {}): void {
    const { showIcons = true, compact = false, align = 'left' } = options;
    
    const separator = compact ? '─'.repeat(40) : '━'.repeat(50);
    
    console.log(chalk.cyan('\n' + separator));
    console.log(chalk.bold.white(`  ${title}`));
    console.log(chalk.cyan(separator));

    const maxLabelLength = Math.max(...stats.map(s => s.label.length));

    stats.forEach(stat => {
      const paddedLabel = align === 'left' 
        ? stat.label.padEnd(maxLabelLength)
        : stat.label.padStart(maxLabelLength);
      
      const colorFn = stat.color ? (chalk as any)[stat.color] : chalk.white;
      const icon = showIcons && stat.icon ? `${stat.icon} ` : '';
      const trend = stat.trend ? this.getTrendIcon(stat.trend) + ' ' : '';
      
      console.log(
        '  ' + chalk.gray(paddedLabel) + chalk.gray(': ') + 
        icon + trend + colorFn(stat.value)
      );
    });

    console.log(chalk.cyan(separator + '\n'));
  }

  private getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    const icons = {
      up: '↗',
      down: '↘',
      stable: '→'
    };
    return icons[trend];
  }

  printStats(stats: Record<string, number | string>, options: { 
    formatNumbers?: boolean; 
    showDelta?: boolean;
    previousStats?: Record<string, number>;
  } = {}): void {
    const { formatNumbers = false, showDelta = false, previousStats = {} } = options;
    
    console.log(chalk.cyan('\n📊 Statistics:\n'));

    Object.entries(stats).forEach(([key, value]) => {
      const previousValue = previousStats[key];
      const delta = showDelta && typeof value === 'number' && typeof previousValue === 'number' 
        ? value - previousValue 
        : null;
      
      const deltaText = delta !== null 
        ? chalk.gray(` (${delta >= 0 ? '+' : ''}${delta})`)
        : '';
      
      const formattedValue = formatNumbers && typeof value === 'number' 
        ? this.formatNumber(value)
        : value;
      
      const icon = this.getStatIcon(value, previousValue);
      
      console.log(`  ${chalk.gray(icon)} ${chalk.white(key)}: ${chalk.cyan(formattedValue)}${deltaText}`);
    });

    console.log('');
  }

  private getStatIcon(current: number | string, previous?: number): string {
    if (typeof current !== 'number' || typeof previous !== 'number') {
      return '○';
    }
    
    if (current > previous) return '↗';
    if (current < previous) return '↘';
    return '○';
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // ============================================
  // Advanced Code Display & Syntax Highlighting
  // ============================================

  printCode(code: string, language?: string, options: {
    lineNumbers?: boolean;
    highlightLines?: number[];
    startLine?: number;
  } = {}): void {
    const { lineNumbers = true, highlightLines = [], startLine = 1 } = options;
    const highlightedCode = this.highlightCode(code, language);
    
    console.log(chalk.gray('\n┌─ Code ') + chalk.gray('─'.repeat(43)));
    console.log(chalk.gray('│'));
    
    highlightedCode.split('\n').forEach((line, index) => {
      const lineNumber = startLine + index;
      const isHighlighted = highlightLines.includes(lineNumber);
      const lineNumberText = lineNumbers 
        ? chalk.gray(lineNumber.toString().padStart(3) + ' │ ') 
        : chalk.gray('│ ');
      
      const lineContent = isHighlighted ? chalk.bgYellow.black(line) : line;
      
      console.log(chalk.gray('│ ') + lineNumberText + lineContent);
    });
    
    console.log(chalk.gray('│'));
    console.log(chalk.gray('└') + chalk.gray('─'.repeat(49)) + '\n');
  }

  private highlightCode(code: string, language?: string): string {
    // Extended syntax highlighting
    const patterns = {
      keywords: ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'default', 'from'],
      types: ['string', 'number', 'boolean', 'object', 'array', 'void', 'any'],
      constants: ['true', 'false', 'null', 'undefined'],
      functions: ['console', 'log', 'error', 'warn']
    };

    return code.split('\n').map(line => {
      let highlighted = line;
      
      // Keywords
      patterns.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g');
        highlighted = highlighted.replace(regex, chalk.magenta(keyword));
      });
      
      // Types
      patterns.types.forEach(type => {
        const regex = new RegExp(`\\b${type}\\b`, 'g');
        highlighted = highlighted.replace(regex, chalk.blue(type));
      });
      
      // Constants
      patterns.constants.forEach(constant => {
        const regex = new RegExp(`\\b${constant}\\b`, 'g');
        highlighted = highlighted.replace(regex, chalk.yellow(constant));
      });
      
      // Functions
      patterns.functions.forEach(func => {
        const regex = new RegExp(`\\b${func}\\b`, 'g');
        highlighted = highlighted.replace(regex, chalk.cyan(func));
      });
      
      // Strings
      highlighted = highlighted.replace(/(["'`])(.*?)\1/g, (match) => chalk.green(match));
      
      // Numbers
      highlighted = highlighted.replace(/\b(\d+)\b/g, (match) => chalk.yellow(match));
      
      // Comments
      highlighted = highlighted.replace(/(\/\/.*$)/g, (match) => chalk.gray(match));
      highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, (match) => chalk.gray(match));
      
      return highlighted;
    }).join('\n');
  }

  // ============================================
  // Advanced Interactive Prompts
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
          resolve(['y', 'yes', '1'].includes(answer.toLowerCase()));
        }
      });
    });
  }

  async input(message: string, options: {
    defaultValue?: string;
    validate?: (input: string) => boolean | string;
    placeholder?: string;
  } = {}): Promise<string> {
    const { defaultValue, validate, placeholder } = options;
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const ask = () => {
        const prompt = defaultValue ? chalk.gray(`(${defaultValue})`) : placeholder ? chalk.gray(`[${placeholder}]`) : '';
        rl.question(chalk.cyan(`? ${message} ${prompt} `), (answer) => {
          const finalAnswer = answer || defaultValue || '';
          
          if (validate) {
            const validationResult = validate(finalAnswer);
            if (validationResult !== true) {
              this.error(typeof validationResult === 'string' ? validationResult : 'Invalid input');
              ask(); // Ask again
              return;
            }
          }
          
          rl.close();
          resolve(finalAnswer);
        });
      };
      
      ask();
    });
  }

  async select<T>(
    message: string,
    choices: Array<{ name: string; value: T; description?: string }>,
    options: { pageSize?: number } = {}
  ): Promise<T> {
    // Simple implementation - in real world you might want to use inquirer
    console.log(chalk.cyan(`\n${message}`));
    
    choices.forEach((choice, index) => {
      const number = chalk.cyan(`${index + 1}.`);
      const description = choice.description ? chalk.gray(` - ${choice.description}`) : '';
      console.log(`  ${number} ${choice.name}${description}`);
    });
    
    const answer = await this.input('Select an option', {
      validate: (input) => {
        const num = parseInt(input);
        if (isNaN(num) || num < 1 || num > choices.length) {
          return `Please enter a number between 1 and ${choices.length}`;
        }
        return true;
      }
    });
    
    return choices[parseInt(answer) - 1].value;
  }

  // ============================================
  // Advanced Helpers & Utilities
  // ============================================

  clearScreen(): void {
    console.clear();
    if (this.config.timestamp) {
      console.log(chalk.gray(`Cleared at: ${this.formatTime()}\n`));
    }
  }

  newLine(count: number = 1): void {
    console.log('\n'.repeat(count - 1));
  }

  printSeparator(char: string = '─', length: number = 50, color: string = 'gray'): void {
    const colorFn = (chalk as any)[color] || chalk.gray;
    console.log(colorFn(char.repeat(length)));
  }

  printEmptyLine(): void {
    console.log('');
  }

  // ============================================
  // Advanced Tips & Suggestions
  // ============================================

  printTip(message: string, options: { type?: 'tip' | 'warning' | 'info' | 'success' } = {}): void {
    const { type = 'tip' } = options;
    const icons = {
      tip: '💡',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    };
    const colors = {
      tip: chalk.yellow,
      warning: chalk.yellow,
      info: chalk.blue,
      success: chalk.green
    };

    console.log(colors[type](`\n${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}: `) + chalk.white(message) + '\n');
  }

  printNextSteps(steps: string[], options: { title?: string; completed?: boolean } = {}): void {
    const { title = 'Next Steps', completed = false } = options;
    const icon = completed ? '✅' : '🎯';
    
    console.log(chalk.cyan(`\n${icon} ${title}:\n`));
    steps.forEach((step, index) => {
      const status = completed ? chalk.green('✓') : chalk.cyan(`${index + 1}.`);
      console.log(`  ${status} ${chalk.white(step)}`);
    });
    console.log('');
  }

  printCommand(command: string, description?: string, options: { copyable?: boolean } = {}): void {
    const { copyable = true } = options;
    const copyHint = copyable ? chalk.gray(' (copy with Ctrl+C)') : '';
    const cmd = chalk.cyan(command);
    const desc = description ? chalk.gray(` - ${description}`) : '';
    console.log(`  ${cmd}${desc}${copyHint}`);
  }

  // ============================================
  // Performance Monitoring
  // ============================================

  private performanceMarks: Map<string, number> = new Map();

  mark(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  measure(name: string, startMark: string, endMark?: string): void {
    const end = endMark ? this.performanceMarks.get(endMark) : Date.now();
    const start = this.performanceMarks.get(startMark);

    if (start && end) {
      const duration = end - start;
      this.debug(`Performance: ${name} took ${this.formatDuration(duration)}`, 'performance');
    }
  }

  printPerformanceReport(): void {
    console.log(chalk.cyan('\n📈 Performance Report:\n'));
    
    // This would need more sophisticated tracking in a real implementation
    this.performanceMarks.forEach((timestamp, name) => {
      const duration = Date.now() - timestamp;
      console.log(`  ${chalk.gray('○')} ${chalk.white(name)}: ${chalk.cyan(this.formatDuration(duration))}`);
    });
    
    console.log('');
  }

  // ============================================
  // Time & Duration Utilities
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
      second: '2-digit',
      hour12: false
    });
  }

  formatDate(date: Date = new Date()): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    this.stopSpinner();
    
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
    
    this.progressBars.clear();
  }
}

// ============================================
// Enhanced Singleton Instance with Configuration
// ============================================

let uiInstance: UI | null = null;

export function getUI(options?: Partial<UIConfig>): UI {
  if (!uiInstance) {
    uiInstance = new UI(options);
  } else if (options) {
    uiInstance.updateConfig(options);
  }
  return uiInstance;
}

export function destroyUI(): void {
  if (uiInstance) {
    uiInstance.destroy();
    uiInstance = null;
  }
}

export const ui = getUI();

// ============================================
// Convenience Exports & Shortcuts
// ============================================

export default ui;

// Shortcut functions for common operations
export const print = {
  info: (msg: string, context?: string) => ui.info(msg, context),
  success: (msg: string, context?: string) => ui.success(msg, context),
  error: (msg: string, context?: string) => ui.error(msg, context),
  warning: (msg: string, context?: string) => ui.warning(msg, context),
  debug: (msg: string, context?: string) => ui.debug(msg, context),
};

export const spinner = {
  start: (text: string, type?: SpinnerType) => ui.startSpinner(text, type),
  succeed: (text?: string) => ui.succeedSpinner(text),
  fail: (text?: string) => ui.failSpinner(text),
  update: (text: string) => ui.updateSpinner(text),
};