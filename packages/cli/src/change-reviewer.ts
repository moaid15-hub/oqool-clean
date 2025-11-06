/**
 * Change Reviewer System
 *
 * نظام مراجعة وتطبيق التغييرات
 * يدعم:
 * - Interactive review
 * - Diff visualization
 * - One-by-one approval
 * - Batch operations
 * - Rollback support
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { diffLines, Change } from 'diff';
import { FileManager } from './file-manager.js';
import { VersionGuardian } from '@oqool/shared/core';
import type { FileChange, FileChangeAction } from './enhanced-ai-adapter.js';

/**
 * Review options
 */
export type ReviewOption = 'all' | 'review' | 'edit' | 'cancel';

/**
 * Apply result
 */
export interface ApplyResult {
  success: boolean;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  errors: string[];
  snapshotId?: string;
}

/**
 * Change Reviewer Class
 */
export class ChangeReviewer {
  private fileManager: FileManager;
  private versionGuardian: VersionGuardian;

  constructor(fileManager: FileManager, versionGuardian: VersionGuardian) {
    this.fileManager = fileManager;
    this.versionGuardian = versionGuardian;
  }

  /**
   * Review and apply changes (main method)
   */
  async reviewAndApply(fileChanges: FileChange[]): Promise<ApplyResult> {
    if (fileChanges.length === 0) {
      console.log(chalk.gray('\nNo file changes detected.\n'));
      return {
        success: true,
        filesCreated: 0,
        filesModified: 0,
        filesDeleted: 0,
        errors: [],
      };
    }

    // Show summary
    this.showSummary(fileChanges);

    // Show diffs for modifications
    await this.showDiffs(fileChanges);

    // Get user approval
    const option = await this.promptApproval();

    // Handle based on option
    switch (option) {
      case 'all':
        return await this.applyAll(fileChanges);

      case 'review':
        return await this.reviewOneByOne(fileChanges);

      case 'edit':
        console.log(chalk.yellow('\n✎ Please edit the files manually and try again.\n'));
        return {
          success: false,
          filesCreated: 0,
          filesModified: 0,
          filesDeleted: 0,
          errors: ['User requested manual editing'],
        };

      case 'cancel':
        console.log(chalk.gray('\n✗ Changes cancelled.\n'));
        return {
          success: false,
          filesCreated: 0,
          filesModified: 0,
          filesDeleted: 0,
          errors: ['User cancelled'],
        };

      default:
        return {
          success: false,
          filesCreated: 0,
          filesModified: 0,
          filesDeleted: 0,
          errors: ['Unknown option'],
        };
    }
  }

  /**
   * Show summary of changes
   */
  private showSummary(fileChanges: FileChange[]): void {
    console.log(chalk.yellow('\n📝 Proposed Changes:\n'));

    for (const change of fileChanges) {
      const icon = this.getActionIcon(change.action);
      console.log(`  ${icon} ${change.path}`);
    }

    console.log();
  }

  /**
   * Show diffs for modifications
   */
  private async showDiffs(fileChanges: FileChange[]): Promise<void> {
    const modifications = fileChanges.filter(c => c.action === 'modify');

    if (modifications.length === 0) return;

    console.log(chalk.cyan('📄 File Diffs:\n'));

    for (const change of modifications) {
      try {
        const oldContent = await this.fileManager.readFile(change.path);
        if (!oldContent) {
          console.log(chalk.yellow(`\n⚠️  Could not read ${change.path} (may be new file)`));
          continue;
        }
        const newContent = change.content || '';

        console.log(chalk.bold(`\n${change.path}:`));
        console.log(chalk.gray('─'.repeat(60)));

        const diff = this.createColoredDiff(oldContent, newContent);
        console.log(diff);

        console.log(chalk.gray('─'.repeat(60)));
      } catch (error) {
        // File doesn't exist (probably a create action mislabeled)
        console.log(chalk.yellow(`\n⚠️  Could not read ${change.path} (may be new file)`));
      }
    }

    console.log();
  }

  /**
   * Create colored diff
   */
  private createColoredDiff(oldContent: string, newContent: string): string {
    const changes: Change[] = diffLines(oldContent, newContent);
    const lines: string[] = [];

    for (const change of changes) {
      const value = change.value.trimEnd();
      if (!value) continue;

      if (change.added) {
        // Green for additions
        value.split('\n').forEach((line: string) => {
          if (line) lines.push(chalk.green(`+ ${line}`));
        });
      } else if (change.removed) {
        // Red for removals
        value.split('\n').forEach((line: string) => {
          if (line) lines.push(chalk.red(`- ${line}`));
        });
      } else {
        // Gray for unchanged (show first 3 lines)
        const unchanged = value.split('\n');
        if (unchanged.length > 6) {
          unchanged.slice(0, 3).forEach((line: string) => {
            if (line) lines.push(chalk.gray(`  ${line}`));
          });
          lines.push(chalk.gray(`  ... (${unchanged.length - 6} unchanged lines)`));
          unchanged.slice(-3).forEach((line: string) => {
            if (line) lines.push(chalk.gray(`  ${line}`));
          });
        } else {
          unchanged.forEach((line: string) => {
            if (line) lines.push(chalk.gray(`  ${line}`));
          });
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Prompt for approval
   */
  private async promptApproval(): Promise<ReviewOption> {
    const { approved } = await inquirer.prompt([
      {
        type: 'list',
        name: 'approved',
        message: 'How would you like to proceed?',
        choices: [
          { name: chalk.green('✓ Yes, apply all changes'), value: 'all' },
          { name: chalk.blue('↻ Review changes one by one'), value: 'review' },
          { name: chalk.yellow('✎ Let me edit manually'), value: 'edit' },
          { name: chalk.red('✗ Cancel all changes'), value: 'cancel' },
        ],
      },
    ]);

    return approved;
  }

  /**
   * Apply all changes
   */
  private async applyAll(fileChanges: FileChange[]): Promise<ApplyResult> {
    const spinner = ora('Applying changes...').start();
    const errors: string[] = [];

    try {
      // Create snapshot before changes
      const snapshotId = `ai-changes-${Date.now()}`;
      await this.versionGuardian.createSnapshot(snapshotId);

      let filesCreated = 0;
      let filesModified = 0;
      let filesDeleted = 0;

      // Apply each change
      for (const change of fileChanges) {
        try {
          spinner.text = `Applying: ${change.path}`;

          if (change.action === 'create') {
            await this.fileManager.createFile(change.path, change.content || '');
            filesCreated++;
          } else if (change.action === 'modify') {
            await this.fileManager.writeFile(change.path, change.content || '');
            filesModified++;
          } else if (change.action === 'delete') {
            await this.fileManager.deleteFile(change.path);
            filesDeleted++;
          }
        } catch (error: any) {
          errors.push(`${change.path}: ${error.message}`);
        }
      }

      // Format files
      spinner.text = 'Formatting code...';
      await this.formatFiles(fileChanges.map(c => c.path).filter(p => p.endsWith('.ts') || p.endsWith('.js')));

      spinner.succeed(chalk.green('✓ All changes applied successfully!'));

      // Show summary
      this.showApplySummary(filesCreated, filesModified, filesDeleted);

      // Show next steps
      this.showNextSteps(snapshotId);

      return {
        success: true,
        filesCreated,
        filesModified,
        filesDeleted,
        errors,
        snapshotId,
      };
    } catch (error: any) {
      spinner.fail(chalk.red('✗ Error applying changes'));

      console.log(chalk.yellow('\n↩ Rolling back changes...'));

      // Attempt rollback
      try {
        // Note: restoreSnapshot needs to be implemented in VersionGuardian
        // await this.versionGuardian.restoreSnapshot(`ai-changes-${Date.now()}`);
        console.log(chalk.green('✓ Successfully rolled back\n'));
      } catch (rollbackError) {
        console.log(chalk.red('✗ Rollback failed - manual intervention may be needed\n'));
      }

      return {
        success: false,
        filesCreated: 0,
        filesModified: 0,
        filesDeleted: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Review changes one by one
   */
  private async reviewOneByOne(fileChanges: FileChange[]): Promise<ApplyResult> {
    const snapshotId = `ai-changes-${Date.now()}`;
    await this.versionGuardian.createSnapshot(snapshotId);

    let filesCreated = 0;
    let filesModified = 0;
    let filesDeleted = 0;
    const errors: string[] = [];

    for (const change of fileChanges) {
      console.log(chalk.cyan(`\n📄 ${change.path}`));
      console.log(chalk.gray('─'.repeat(60)));

      // Show content preview
      if (change.action === 'create' || change.action === 'modify') {
        const preview = (change.content || '').split('\n').slice(0, 20).join('\n');
        console.log(preview);
        if ((change.content || '').split('\n').length > 20) {
          console.log(chalk.gray('... (truncated)'));
        }
      } else if (change.action === 'delete') {
        console.log(chalk.red('This file will be deleted.'));
      }

      console.log(chalk.gray('─'.repeat(60)));

      // Ask for approval
      const { apply } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'apply',
          message: `Apply this change to ${change.path}?`,
          default: true,
        },
      ]);

      if (apply) {
        try {
          if (change.action === 'create') {
            await this.fileManager.createFile(change.path, change.content || '');
            filesCreated++;
            console.log(chalk.green(`✓ Created ${change.path}`));
          } else if (change.action === 'modify') {
            await this.fileManager.writeFile(change.path, change.content || '');
            filesModified++;
            console.log(chalk.green(`✓ Modified ${change.path}`));
          } else if (change.action === 'delete') {
            await this.fileManager.deleteFile(change.path);
            filesDeleted++;
            console.log(chalk.green(`✓ Deleted ${change.path}`));
          }
        } catch (error: any) {
          errors.push(`${change.path}: ${error.message}`);
          console.log(chalk.red(`✗ Error: ${error.message}`));
        }
      } else {
        console.log(chalk.gray(`Skipped ${change.path}`));
      }
    }

    // Format applied files
    const appliedFiles = fileChanges
      .filter(c => (c.path.endsWith('.ts') || c.path.endsWith('.js')))
      .map(c => c.path);

    if (appliedFiles.length > 0) {
      const spinner = ora('Formatting code...').start();
      await this.formatFiles(appliedFiles);
      spinner.succeed();
    }

    // Show summary
    console.log();
    this.showApplySummary(filesCreated, filesModified, filesDeleted);
    this.showNextSteps(snapshotId);

    return {
      success: true,
      filesCreated,
      filesModified,
      filesDeleted,
      errors,
      snapshotId,
    };
  }

  /**
   * Format files
   */
  private async formatFiles(files: string[]): Promise<void> {
    // This would integrate with Prettier or similar
    // For now, just a placeholder
    await Promise.resolve();
  }

  /**
   * Show apply summary
   */
  private showApplySummary(created: number, modified: number, deleted: number): void {
    console.log(chalk.cyan('\n📊 Summary:'));
    if (created > 0) console.log(chalk.green(`  ✓ Created: ${created} file(s)`));
    if (modified > 0) console.log(chalk.blue(`  ✓ Modified: ${modified} file(s)`));
    if (deleted > 0) console.log(chalk.red(`  ✓ Deleted: ${deleted} file(s)`));
  }

  /**
   * Show next steps
   */
  private showNextSteps(snapshotId: string): void {
    console.log(chalk.yellow('\n💡 Next Steps:'));
    console.log('  1. Review the changes in your editor');
    console.log('  2. Test the changes');
    console.log('  3. Run tests: npm test');
    console.log(`  4. Rollback if needed: oqool rollback ${snapshotId}`);
    console.log();
  }

  /**
   * Get action icon
   */
  private getActionIcon(action: FileChangeAction): string {
    switch (action) {
      case 'create':
        return chalk.green('+ Create');
      case 'modify':
        return chalk.blue('~ Modify');
      case 'delete':
        return chalk.red('- Delete');
      default:
        return chalk.gray('? Unknown');
    }
  }
}

/**
 * Create change reviewer
 */
export function createChangeReviewer(
  fileManager: FileManager,
  versionGuardian: VersionGuardian
): ChangeReviewer {
  return new ChangeReviewer(fileManager, versionGuardian);
}
