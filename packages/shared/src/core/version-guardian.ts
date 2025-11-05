// version-guardian.ts
// ============================================
// 🛡️ Version Guardian - نظام حماية وإدارة الإصدارات
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

// ============================================
// 📦 Types & Interfaces
// ============================================

export interface Snapshot {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  files: SnapshotFile[];
  metadata: SnapshotMetadata;
  gitCommit?: string;
  tags: string[];
}

export interface SnapshotFile {
  path: string;
  content: string;
  hash: string;
  size: number;
}

export interface SnapshotMetadata {
  projectPath: string;
  totalFiles: number;
  totalSize: number;
  createdBy: string;
  version: string;
}

export interface Version {
  id: string;
  name: string;
  timestamp: number;
  changes: Change[];
  snapshot: string; // snapshot ID
}

export interface Change {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  oldContent?: string;
  newContent?: string;
  timestamp: number;
}

export interface DiffResult {
  file: string;
  changes: DiffChange[];
  additions: number;
  deletions: number;
  summary: string;
}

export interface DiffChange {
  type: 'add' | 'remove' | 'modify';
  lineNumber: number;
  oldLine?: string;
  newLine?: string;
}

export interface Backup {
  id: string;
  name: string;
  timestamp: number;
  path: string;
  size: number;
  compressed: boolean;
  cloud?: boolean;
  cloudUrl?: string;
}

export interface ConflictResolution {
  file: string;
  conflicts: Conflict[];
  suggestedResolution: string;
  confidence: number;
}

export interface Conflict {
  startLine: number;
  endLine: number;
  currentVersion: string;
  incomingVersion: string;
  type: 'content' | 'structure' | 'both';
}

export interface VersionAnalytics {
  totalVersions: number;
  totalSnapshots: number;
  totalBackups: number;
  averageChangesPerVersion: number;
  mostChangedFiles: FileStats[];
  timeline: TimelineEntry[];
  sizeGrowth: SizeGrowthData[];
}

export interface FileStats {
  path: string;
  changeCount: number;
  lastModified: number;
}

export interface TimelineEntry {
  timestamp: number;
  event: string;
  type: 'snapshot' | 'version' | 'backup' | 'rollback';
  description: string;
}

export interface SizeGrowthData {
  timestamp: number;
  size: number;
  fileCount: number;
}

export interface GuardianConfig {
  apiKey: string;
  projectPath: string;
  guardianPath?: string;
  autoBackup?: boolean;
  backupInterval?: number; // minutes
  maxSnapshots?: number;
  enableGit?: boolean;
  cloudBackup?: boolean;
}

export interface SmartSuggestion {
  type: 'optimization' | 'cleanup' | 'merge' | 'backup' | 'security';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action?: () => Promise<void>;
}

// ============================================
// 🛡️ Version Guardian Class
// ============================================

export class VersionGuardian {
  private anthropic: Anthropic;
  private config: GuardianConfig;
  private guardianPath: string;
  private snapshotsPath: string;
  private backupsPath: string;
  private historyPath: string;
  private autoBackupInterval?: NodeJS.Timeout;

  constructor(config: GuardianConfig) {
    this.config = config;
    this.anthropic = new Anthropic({ apiKey: config.apiKey });

    // Setup paths
    if (config.guardianPath) {
      this.guardianPath = config.guardianPath;
    } else {
      const homeDir = os.homedir();
      this.guardianPath = path.join(homeDir, '.oqool', 'guardian');
    }

    this.snapshotsPath = path.join(this.guardianPath, 'snapshots');
    this.backupsPath = path.join(this.guardianPath, 'backups');
    this.historyPath = path.join(this.guardianPath, 'history.json');
  }

  // ============================================
  // 1️⃣ Version Tracking - تتبع الإصدارات
  // ============================================

  async init(): Promise<void> {
    console.log(chalk.cyan('🛡️ Initializing Version Guardian...\n'));

    // Create guardian directories
    await fs.mkdir(this.guardianPath, { recursive: true });
    await fs.mkdir(this.snapshotsPath, { recursive: true });
    await fs.mkdir(this.backupsPath, { recursive: true });

    // Initialize history file
    const initialHistory = {
      versions: [],
      snapshots: [],
      backups: [],
      timeline: [],
    };
    await fs.writeFile(this.historyPath, JSON.stringify(initialHistory, null, 2));

    // Initialize Git if enabled
    if (this.config.enableGit) {
      await this.initGit();
    }

    // Start auto-backup if enabled
    if (this.config.autoBackup) {
      this.startAutoBackup();
    }

    console.log(chalk.green('✅ Version Guardian initialized successfully!'));
    console.log(chalk.gray(`   Guardian Path: ${this.guardianPath}`));
    console.log(chalk.gray(`   Project Path: ${this.config.projectPath}`));
    if (this.config.enableGit) {
      console.log(chalk.gray(`   Git: Enabled`));
    }
    if (this.config.autoBackup) {
      console.log(chalk.gray(`   Auto-Backup: Every ${this.config.backupInterval || 30} minutes`));
    }
  }

  // ============================================
  // 2️⃣ Snapshot Manager - مدير اللقطات
  // ============================================

  async createSnapshot(name: string, description?: string): Promise<Snapshot> {
    console.log(chalk.cyan(`📸 Creating snapshot: ${name}...\n`));

    const files = await this.scanProjectFiles();
    const snapshotFiles: SnapshotFile[] = [];

    for (const filePath of files) {
      const fullPath = path.join(this.config.projectPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const stats = await fs.stat(fullPath);

      snapshotFiles.push({
        path: filePath,
        content,
        hash,
        size: stats.size,
      });
    }

    const totalSize = snapshotFiles.reduce((sum, f) => sum + f.size, 0);

    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}`,
      name,
      description,
      timestamp: Date.now(),
      files: snapshotFiles,
      metadata: {
        projectPath: this.config.projectPath,
        totalFiles: snapshotFiles.length,
        totalSize,
        createdBy: os.userInfo().username,
        version: '1.0.0',
      },
      tags: [],
    };

    // Create Git commit if enabled
    if (this.config.enableGit) {
      try {
        const commitHash = await this.createGitCommit(name, description);
        snapshot.gitCommit = commitHash;
      } catch (error) {
        console.log(chalk.yellow('⚠️  Git commit failed, continuing without it'));
      }
    }

    // Save snapshot
    const snapshotPath = path.join(this.snapshotsPath, `${snapshot.id}.json`);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    // Update history
    await this.addToHistory({
      timestamp: Date.now(),
      event: `Snapshot created: ${name}`,
      type: 'snapshot',
      description: description || 'No description',
    });

    console.log(chalk.green(`✅ Snapshot created: ${snapshot.id}`));
    console.log(chalk.gray(`   Files: ${snapshot.metadata.totalFiles}`));
    console.log(chalk.gray(`   Size: ${this.formatSize(totalSize)}`));
    if (snapshot.gitCommit) {
      console.log(chalk.gray(`   Git Commit: ${snapshot.gitCommit.substring(0, 7)}`));
    }

    return snapshot;
  }

  async listSnapshots(): Promise<Snapshot[]> {
    const files = await fs.readdir(this.snapshotsPath);
    const snapshots: Snapshot[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(this.snapshotsPath, file), 'utf-8');
        snapshots.push(JSON.parse(content));
      }
    }

    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshotPath = path.join(this.snapshotsPath, `${snapshotId}.json`);
    await fs.unlink(snapshotPath);
    console.log(chalk.green(`✅ Snapshot deleted: ${snapshotId}`));
  }

  // ============================================
  // 3️⃣ Smart Rollback - رجوع ذكي
  // ============================================

  async rollback(
    snapshotId: string,
    options?: { backup?: boolean; gitTag?: string }
  ): Promise<void> {
    console.log(chalk.cyan(`⏮️  Rolling back to snapshot: ${snapshotId}...\n`));

    // Create backup before rollback
    if (options?.backup !== false) {
      console.log(chalk.yellow('📦 Creating backup before rollback...'));
      await this.createBackup(`pre-rollback-${Date.now()}`);
    }

    // Load snapshot
    const snapshotPath = path.join(this.snapshotsPath, `${snapshotId}.json`);
    const snapshot: Snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf-8'));

    console.log(chalk.cyan(`Restoring ${snapshot.metadata.totalFiles} files...`));

    // Restore files
    for (const file of snapshot.files) {
      const fullPath = path.join(this.config.projectPath, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.content);
    }

    // Create Git tag if requested
    if (options?.gitTag && this.config.enableGit) {
      await this.createGitTag(options.gitTag, `Rollback to ${snapshot.name}`);
    }

    // Update history
    await this.addToHistory({
      timestamp: Date.now(),
      event: `Rolled back to: ${snapshot.name}`,
      type: 'rollback',
      description: `Restored ${snapshot.metadata.totalFiles} files`,
    });

    console.log(chalk.green(`\n✅ Rollback complete!`));
    console.log(chalk.gray(`   Snapshot: ${snapshot.name}`));
    console.log(chalk.gray(`   Files Restored: ${snapshot.metadata.totalFiles}`));
  }

  // ============================================
  // 4️⃣ Diff Viewer - مقارنة التغييرات
  // ============================================

  async diff(snapshot1Id: string, snapshot2Id: string): Promise<DiffResult[]> {
    console.log(chalk.cyan('🔍 Comparing snapshots...\n'));

    const snapshot1 = await this.loadSnapshot(snapshot1Id);
    const snapshot2 = await this.loadSnapshot(snapshot2Id);

    const diffs: DiffResult[] = [];

    // Create file maps for quick lookup
    const files1 = new Map(snapshot1.files.map((f) => [f.path, f]));
    const files2 = new Map(snapshot2.files.map((f) => [f.path, f]));

    // Get all unique file paths
    const allPaths = new Set([...files1.keys(), ...files2.keys()]);

    for (const filePath of allPaths) {
      const file1 = files1.get(filePath);
      const file2 = files2.get(filePath);

      if (!file1) {
        // File added
        diffs.push({
          file: filePath,
          changes: [{ type: 'add', lineNumber: 0, newLine: file2!.content }],
          additions: file2!.content.split('\n').length,
          deletions: 0,
          summary: 'File added',
        });
      } else if (!file2) {
        // File deleted
        diffs.push({
          file: filePath,
          changes: [{ type: 'remove', lineNumber: 0, oldLine: file1.content }],
          additions: 0,
          deletions: file1.content.split('\n').length,
          summary: 'File deleted',
        });
      } else if (file1.hash !== file2.hash) {
        // File modified
        const changes = this.computeDiff(file1.content, file2.content);
        const additions = changes.filter((c) => c.type === 'add').length;
        const deletions = changes.filter((c) => c.type === 'remove').length;

        diffs.push({
          file: filePath,
          changes,
          additions,
          deletions,
          summary: `+${additions} -${deletions}`,
        });
      }
    }

    return diffs;
  }

  async showDiff(snapshot1Id: string, snapshot2Id: string): Promise<void> {
    const diffs = await this.diff(snapshot1Id, snapshot2Id);

    console.log(chalk.bold('\n📊 Differences:\n'));

    for (const diff of diffs) {
      console.log(chalk.cyan(`📄 ${diff.file}`));
      console.log(chalk.gray(`   ${diff.summary}`));

      if (diff.changes.length < 50) {
        diff.changes.forEach((change) => {
          if (change.type === 'add') {
            console.log(chalk.green(`   + ${change.newLine}`));
          } else if (change.type === 'remove') {
            console.log(chalk.red(`   - ${change.oldLine}`));
          }
        });
      }
      console.log();
    }

    const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

    console.log(
      chalk.bold(`Total: ${chalk.green(`+${totalAdditions}`)} ${chalk.red(`-${totalDeletions}`)}`)
    );
  }

  private computeDiff(content1: string, content2: string): DiffChange[] {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    const changes: DiffChange[] = [];

    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i];
      const line2 = lines2[i];

      if (line1 !== line2) {
        if (line1 === undefined) {
          changes.push({ type: 'add', lineNumber: i + 1, newLine: line2 });
        } else if (line2 === undefined) {
          changes.push({ type: 'remove', lineNumber: i + 1, oldLine: line1 });
        } else {
          changes.push({ type: 'modify', lineNumber: i + 1, oldLine: line1, newLine: line2 });
        }
      }
    }

    return changes;
  }

  // ============================================
  // 5️⃣ Auto-Backup - نسخ احتياطي ذكي
  // ============================================

  async createBackup(
    name: string,
    options?: { compress?: boolean; cloud?: boolean }
  ): Promise<Backup> {
    console.log(chalk.cyan(`💾 Creating backup: ${name}...\n`));

    const snapshot = await this.createSnapshot(`backup-${name}`, 'Auto-backup snapshot');
    const backupPath = path.join(this.backupsPath, `${name}.json`);

    let content = JSON.stringify(snapshot);
    let compressed = false;

    if (options?.compress) {
      // Simple compression (in production, use proper compression like zlib)
      compressed = true;
    }

    await fs.writeFile(backupPath, content);
    const stats = await fs.stat(backupPath);

    const backup: Backup = {
      id: `backup-${Date.now()}`,
      name,
      timestamp: Date.now(),
      path: backupPath,
      size: stats.size,
      compressed,
      cloud: options?.cloud,
    };

    // Upload to cloud if requested
    if (options?.cloud && this.config.cloudBackup) {
      // TODO: Implement cloud upload (S3, Google Cloud, etc.)
      console.log(chalk.yellow('⚠️  Cloud backup not yet implemented'));
    }

    console.log(chalk.green(`✅ Backup created: ${name}`));
    console.log(chalk.gray(`   Size: ${this.formatSize(stats.size)}`));

    return backup;
  }

  startAutoBackup(): void {
    const interval = (this.config.backupInterval || 30) * 60 * 1000; // Convert to ms

    this.autoBackupInterval = setInterval(async () => {
      console.log(chalk.cyan('\n⏰ Auto-backup triggered...'));
      await this.createBackup(`auto-${Date.now()}`);
    }, interval);

    console.log(
      chalk.green(`🔄 Auto-backup started (every ${this.config.backupInterval || 30} minutes)`)
    );
  }

  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      console.log(chalk.yellow('⏸️  Auto-backup stopped'));
    }
  }

  async restoreBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupsPath, `${backupName}.json`);
    const snapshot: Snapshot = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
    await this.rollback(snapshot.id, { backup: false });
  }

  // ============================================
  // 6️⃣ Git Integration - تكامل Git
  // ============================================

  private async initGit(): Promise<void> {
    try {
      execSync('git --version', { stdio: 'ignore' });
    } catch {
      throw new Error('Git is not installed');
    }

    try {
      execSync('git rev-parse --git-dir', { cwd: this.config.projectPath, stdio: 'ignore' });
    } catch {
      execSync('git init', { cwd: this.config.projectPath });
      console.log(chalk.green('✅ Git repository initialized'));
    }
  }

  private async createGitCommit(message: string, description?: string): Promise<string> {
    const cwd = this.config.projectPath;

    execSync('git add .', { cwd });

    const fullMessage = description ? `${message}\n\n${description}` : message;
    execSync(`git commit -m "${fullMessage}"`, { cwd });

    const hash = execSync('git rev-parse HEAD', { cwd }).toString().trim();
    return hash;
  }

  private async createGitTag(tag: string, message: string): Promise<void> {
    const cwd = this.config.projectPath;
    execSync(`git tag -a ${tag} -m "${message}"`, { cwd });
    console.log(chalk.green(`✅ Git tag created: ${tag}`));
  }

  async getGitHistory(): Promise<any[]> {
    const cwd = this.config.projectPath;
    const output = execSync('git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso', {
      cwd,
    }).toString();

    return output.split('\n').map((line) => {
      const [hash, author, email, date, message] = line.split('|');
      return { hash, author, email, date, message };
    });
  }

  // ============================================
  // 7️⃣ Change History & File Archaeology - سجل التغييرات
  // ============================================

  async getChangeHistory(): Promise<TimelineEntry[]> {
    const historyData = JSON.parse(await fs.readFile(this.historyPath, 'utf-8'));
    return historyData.timeline || [];
  }

  async showHistory(limit?: number): Promise<void> {
    const history = await this.getChangeHistory();
    const entries = limit ? history.slice(0, limit) : history;

    console.log(chalk.bold('\n📜 Change History:\n'));

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp).toLocaleString();
      const icon = this.getEventIcon(entry.type);

      console.log(chalk.cyan(`${icon} ${entry.event}`));
      console.log(chalk.gray(`   ${date} - ${entry.description}\n`));
    });
  }

  async getFileHistory(filePath: string): Promise<Change[]> {
    const snapshots = await this.listSnapshots();
    const changes: Change[] = [];

    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i].files.find((f) => f.path === filePath);
      const previous = snapshots[i + 1].files.find((f) => f.path === filePath);

      if (!previous && current) {
        changes.push({
          type: 'added',
          path: filePath,
          newContent: current.content,
          timestamp: snapshots[i].timestamp,
        });
      } else if (previous && !current) {
        changes.push({
          type: 'deleted',
          path: filePath,
          oldContent: previous.content,
          timestamp: snapshots[i].timestamp,
        });
      } else if (previous && current && previous.hash !== current.hash) {
        changes.push({
          type: 'modified',
          path: filePath,
          oldContent: previous.content,
          newContent: current.content,
          timestamp: snapshots[i].timestamp,
        });
      }
    }

    return changes;
  }

  async showFileArchaeology(filePath: string): Promise<void> {
    console.log(chalk.bold(`\n🏺 File Archaeology: ${filePath}\n`));

    const changes = await this.getFileHistory(filePath);

    changes.forEach((change) => {
      const date = new Date(change.timestamp).toLocaleString();
      const icon = change.type === 'added' ? '➕' : change.type === 'deleted' ? '➖' : '✏️';

      console.log(chalk.cyan(`${icon} ${change.type.toUpperCase()}`));
      console.log(chalk.gray(`   ${date}\n`));
    });

    console.log(chalk.gray(`Total changes: ${changes.length}`));
  }

  private async addToHistory(entry: TimelineEntry): Promise<void> {
    const historyData = JSON.parse(await fs.readFile(this.historyPath, 'utf-8'));
    historyData.timeline.unshift(entry);
    await fs.writeFile(this.historyPath, JSON.stringify(historyData, null, 2));
  }

  // ============================================
  // 8️⃣ Version Analytics - تحليلات الإصدارات
  // ============================================

  async getAnalytics(): Promise<VersionAnalytics> {
    const snapshots = await this.listSnapshots();
    const history = await this.getChangeHistory();

    // Calculate most changed files
    const fileChanges = new Map<string, number>();

    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i];
      const previous = snapshots[i + 1];

      for (const file of current.files) {
        const prevFile = previous.files.find((f) => f.path === file.path);
        if (prevFile && prevFile.hash !== file.hash) {
          fileChanges.set(file.path, (fileChanges.get(file.path) || 0) + 1);
        }
      }
    }

    const mostChangedFiles: FileStats[] = Array.from(fileChanges.entries())
      .map(([path, changeCount]) => ({
        path,
        changeCount,
        lastModified: Date.now(),
      }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    // Calculate size growth
    const sizeGrowth: SizeGrowthData[] = snapshots.map((s) => ({
      timestamp: s.timestamp,
      size: s.metadata.totalSize,
      fileCount: s.metadata.totalFiles,
    }));

    return {
      totalVersions: 0,
      totalSnapshots: snapshots.length,
      totalBackups: 0,
      averageChangesPerVersion: 0,
      mostChangedFiles,
      timeline: history,
      sizeGrowth,
    };
  }

  async showAnalytics(): Promise<void> {
    console.log(chalk.bold('\n📊 Version Analytics\n'));

    const analytics = await this.getAnalytics();

    console.log(chalk.cyan('📈 Overview:'));
    console.log(chalk.white(`   Total Snapshots: ${analytics.totalSnapshots}`));
    console.log(chalk.white(`   Total Events: ${analytics.timeline.length}\n`));

    console.log(chalk.cyan('🔥 Most Changed Files:'));
    analytics.mostChangedFiles.slice(0, 5).forEach((file, i) => {
      console.log(chalk.white(`   ${i + 1}. ${file.path} (${file.changeCount} changes)`));
    });

    if (analytics.sizeGrowth.length > 0) {
      const latest = analytics.sizeGrowth[0];
      const oldest = analytics.sizeGrowth[analytics.sizeGrowth.length - 1];
      const growth = latest.size - oldest.size;

      console.log(chalk.cyan('\n📦 Size Growth:'));
      console.log(chalk.white(`   Current: ${this.formatSize(latest.size)}`));
      console.log(chalk.white(`   Growth: ${this.formatSize(growth)}`));
    }
  }

  // ============================================
  // 9️⃣ AI-Powered Conflict Resolution - حل التعارضات
  // ============================================

  async resolveConflicts(file: string, conflicts: Conflict[]): Promise<ConflictResolution> {
    console.log(chalk.cyan(`🤖 AI is analyzing conflicts in ${file}...`));

    const prompt = `
You are a code conflict resolution expert. Analyze these conflicts and suggest the best resolution:

File: ${file}

Conflicts:
${conflicts
  .map(
    (c, i) => `
Conflict ${i + 1} (lines ${c.startLine}-${c.endLine}):
Type: ${c.type}

Current Version:
${c.currentVersion}

Incoming Version:
${c.incomingVersion}
`
  )
  .join('\n')}

Provide:
1. The best merged version that combines both changes intelligently
2. Explanation of your reasoning
3. Confidence level (0-100)

Format your response as JSON:
{
  "mergedCode": "...",
  "reasoning": "...",
  "confidence": 95
}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';

    // Parse AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { mergedCode: '', reasoning: '', confidence: 0 };

    return {
      file,
      conflicts,
      suggestedResolution: result.mergedCode,
      confidence: result.confidence,
    };
  }

  // ============================================
  // 🔟 Smart Suggestions - اقتراحات ذكية
  // ============================================

  async getSmartSuggestions(): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const snapshots = await this.listSnapshots();
    const analytics = await this.getAnalytics();

    // Suggest cleanup if too many snapshots
    if (snapshots.length > (this.config.maxSnapshots || 50)) {
      suggestions.push({
        type: 'cleanup',
        title: 'Too many snapshots',
        description: `You have ${snapshots.length} snapshots. Consider cleaning up old ones.`,
        priority: 'medium',
        action: async () => {
          // Keep only the latest N snapshots
          const toDelete = snapshots.slice(this.config.maxSnapshots || 50);
          for (const snapshot of toDelete) {
            await this.deleteSnapshot(snapshot.id);
          }
        },
      });
    }

    // Suggest backup if none created recently
    const lastBackupTime = Math.max(...snapshots.map((s) => s.timestamp));
    const hoursSinceBackup = (Date.now() - lastBackupTime) / (1000 * 60 * 60);

    if (hoursSinceBackup > 24) {
      suggestions.push({
        type: 'backup',
        title: 'No recent backup',
        description: `Last backup was ${Math.floor(hoursSinceBackup)} hours ago. Create a backup now?`,
        priority: 'high',
        action: async () => {
          await this.createBackup(`suggested-${Date.now()}`);
        },
      });
    }

    // Suggest merge if too many small changes
    if (analytics.averageChangesPerVersion < 5 && snapshots.length > 10) {
      suggestions.push({
        type: 'merge',
        title: 'Consider merging snapshots',
        description: 'You have many snapshots with small changes. Consider merging them.',
        priority: 'low',
      });
    }

    return suggestions;
  }

  async showSuggestions(): Promise<void> {
    console.log(chalk.bold('\n💡 Smart Suggestions\n'));

    const suggestions = await this.getSmartSuggestions();

    if (suggestions.length === 0) {
      console.log(chalk.green('✅ Everything looks good! No suggestions at this time.\n'));
      return;
    }

    suggestions.forEach((suggestion, i) => {
      const priorityColor = {
        low: chalk.gray,
        medium: chalk.yellow,
        high: chalk.red,
        critical: chalk.red.bold,
      }[suggestion.priority];

      console.log(
        priorityColor(`${i + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.title}`)
      );
      console.log(chalk.gray(`   ${suggestion.description}\n`));
    });
  }

  // ============================================
  // 1️⃣1️⃣ Visual Timeline - خط زمني مرئي
  // ============================================

  async showTimeline(days?: number): Promise<void> {
    const history = await this.getChangeHistory();
    const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    const filtered = history.filter((e) => e.timestamp > cutoff);

    console.log(chalk.bold('\n📅 Visual Timeline\n'));

    // Group by day
    const byDay = new Map<string, TimelineEntry[]>();

    filtered.forEach((entry) => {
      const day = new Date(entry.timestamp).toDateString();
      if (!byDay.has(day)) {
        byDay.set(day, []);
      }
      byDay.get(day)!.push(entry);
    });

    for (const [day, entries] of byDay) {
      console.log(chalk.bold.cyan(`\n${day}`));
      console.log(chalk.gray('─'.repeat(50)));

      entries.forEach((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const icon = this.getEventIcon(entry.type);
        console.log(chalk.white(`  ${time} ${icon} ${entry.event}`));
      });
    }
    console.log();
  }

  // ============================================
  // 1️⃣2️⃣ Export & Import - نقل النسخ
  // ============================================

  async exportSnapshot(snapshotId: string, outputPath: string): Promise<void> {
    const snapshot = await this.loadSnapshot(snapshotId);
    await fs.writeFile(outputPath, JSON.stringify(snapshot, null, 2));
    console.log(chalk.green(`✅ Snapshot exported to: ${outputPath}`));
  }

  async importSnapshot(importPath: string): Promise<Snapshot> {
    const content = await fs.readFile(importPath, 'utf-8');
    const snapshot: Snapshot = JSON.parse(content);

    // Save to snapshots directory
    const snapshotPath = path.join(this.snapshotsPath, `${snapshot.id}.json`);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));

    console.log(chalk.green(`✅ Snapshot imported: ${snapshot.id}`));
    return snapshot;
  }

  // ============================================
  // 🛠️ Helper Methods
  // ============================================

  private async scanProjectFiles(): Promise<string[]> {
    const files: string[] = [];

    async function scan(dir: string, relativePath: string = ''): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip node_modules, .git, etc.
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    }

    await scan(this.config.projectPath);
    return files;
  }

  private async loadSnapshot(snapshotId: string): Promise<Snapshot> {
    const snapshotPath = path.join(this.snapshotsPath, `${snapshotId}.json`);
    const content = await fs.readFile(snapshotPath, 'utf-8');
    return JSON.parse(content);
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  private getEventIcon(type: string): string {
    const icons: Record<string, string> = {
      snapshot: '📸',
      version: '🏷️',
      backup: '💾',
      rollback: '⏮️',
    };
    return icons[type] || '📌';
  }
}

// ============================================
// 🏭 Factory Function
// ============================================

export function createVersionGuardian(config: GuardianConfig): VersionGuardian {
  return new VersionGuardian(config);
}
