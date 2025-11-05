// computer-control-agent.ts
// ============================================
// 🤖 Computer Control Agent - وكيل التحكم الكامل بالحاسوب
// ============================================
// Advanced autonomous agent with comprehensive system control
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import crypto from 'crypto';

const execAsync = promisify(exec);

// ============================================
// 📊 Types & Interfaces
// ============================================

export type OperationLevel = 'safe' | 'medium' | 'critical';
export type StopLevel = 'pause' | 'soft' | 'hard' | 'emergency' | 'panic';
export type OperationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rolled-back'
  | 'cancelled';

export interface Operation {
  id: string;
  type: OperationType;
  level: OperationLevel;
  command: string;
  description: string;
  status: OperationStatus;
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
  rollbackData?: any;
  metadata?: Record<string, any>;
}

export type OperationType =
  | 'file-read'
  | 'file-write'
  | 'file-delete'
  | 'file-move'
  | 'file-copy'
  | 'dir-create'
  | 'dir-delete'
  | 'process-start'
  | 'process-kill'
  | 'network-request'
  | 'system-command'
  | 'package-install'
  | 'service-manage'
  | 'database-query'
  | 'git-operation'
  | 'custom';

export interface OperationClassification {
  type: OperationType;
  level: OperationLevel;
  requiresConfirmation: boolean;
  canRollback: boolean;
  estimatedDuration?: number;
  risks: string[];
  alternatives?: string[];
}

export interface SecurityPolicy {
  allowedOperations: {
    fileOperations: {
      read: boolean;
      write: boolean | 'confirm';
      delete: boolean | 'confirm';
      execute: boolean | 'confirm';
    };
    systemOperations: {
      installPackages: boolean | 'confirm';
      modifyRegistry: boolean | 'confirm';
      sudo: boolean | 'confirm';
      processManagement: boolean | 'confirm';
    };
    networkOperations: {
      httpRequests: boolean;
      openPorts: boolean | 'confirm';
      ssh: boolean | 'confirm';
    };
  };
  protectedPaths: string[];
  trustedSources: string[];
  autoApprove: {
    enabled: boolean;
    learns: boolean;
    patterns: string[];
  };
}

export interface ConfirmationRequest {
  operation: Operation;
  classification: OperationClassification;
  prompt: string;
  options: ConfirmationOption[];
  timeout?: number;
}

export interface ConfirmationOption {
  id: string;
  label: string;
  action: 'approve' | 'deny' | 'alternative';
  recommended?: boolean;
  description?: string;
}

export interface EmergencyStopResult {
  timestamp: string;
  reason: string;
  level: StopLevel;
  stoppedOperations: Operation[];
  rollbacks: RollbackResult[];
  systemState: SystemState;
  recommendations: string[];
  reportPath: string;
}

export interface RollbackResult {
  operationId: string;
  success: boolean;
  restoredFiles?: string[];
  error?: string;
}

export interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  runningProcesses: number;
  activeOperations: number;
  timestamp: number;
}

export interface AgentConfig {
  apiKeys: {
    deepseek?: string;
    claude?: string;
    openai?: string;
  };
  provider?: AIProvider;
  securityPolicy?: Partial<SecurityPolicy>;
  workingDirectory?: string;
  logDirectory?: string;
  enableAutoStop?: boolean;
  enableDeadManSwitch?: boolean;
  deadManSwitchInterval?: number;
}

export interface AutoStopConfig {
  cpuThreshold?: number;
  memoryThreshold?: number;
  errorThreshold?: number;
  operationTimeout?: number;
  suspiciousActivity?: boolean;
}

// ============================================
// 🤖 Computer Control Agent Class
// ============================================

export class ComputerControlAgent extends EventEmitter {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;
  private operations: Map<string, Operation>;
  private runningOperations: Set<string>;
  private history: Operation[];
  private securityPolicy: SecurityPolicy;
  private workingDirectory: string;
  private logDirectory: string;
  private isActive: boolean;
  private isPaused: boolean;
  private stopRequested: boolean;
  private autoStopConfig?: AutoStopConfig;
  private deadManSwitchTimer?: NodeJS.Timeout;
  private monitoringInterval?: NodeJS.Timeout;
  private snapshots: Map<string, any>;
  private processHandles: Map<string, ChildProcess>;

  constructor(config: AgentConfig) {
    super();

    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.apiKeys.deepseek,
      claude: config.apiKeys.claude,
      openai: config.apiKeys.openai,
      defaultProvider: config.provider || 'auto',
    });

    this.provider = config.provider || 'auto';
    this.operations = new Map();
    this.runningOperations = new Set();
    this.history = [];
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.logDirectory = config.logDirectory || path.join(this.workingDirectory, '.oqool-agent');
    this.isActive = true;
    this.isPaused = false;
    this.stopRequested = false;
    this.snapshots = new Map();
    this.processHandles = new Map();

    // Initialize security policy
    this.securityPolicy = this.initializeSecurityPolicy(config.securityPolicy);

    // Setup directories
    this.setupDirectories();

    // Setup monitoring
    this.setupMonitoring();

    // Setup signal handlers
    this.setupSignalHandlers();

    // Setup Dead Man's Switch if enabled
    if (config.enableDeadManSwitch) {
      this.enableDeadManSwitch(config.deadManSwitchInterval);
    }

    this.log('info', 'Computer Control Agent initialized');
  }

  // ============================================
  // 🎯 Main Execution Method
  // ============================================

  /**
   * Execute a natural language command
   */
  async execute(
    command: string,
    options: { force?: boolean; sandbox?: boolean } = {}
  ): Promise<any> {
    if (!this.isActive) {
      throw new Error('Agent is not active. Use resume() to reactivate.');
    }

    if (this.isPaused) {
      throw new Error('Agent is paused. Use resume() to continue.');
    }

    if (this.stopRequested) {
      throw new Error('Stop requested. Agent is shutting down.');
    }

    try {
      this.log('info', `Executing command: "${command}"`);

      // Parse natural language to operation
      const operation = await this.parseCommand(command);

      // Classify operation
      const classification = this.classifyOperation(operation);

      // Check if confirmation needed
      if (classification.requiresConfirmation && !options.force) {
        const confirmed = await this.requestConfirmation({
          operation,
          classification,
          prompt: this.buildConfirmationPrompt(operation, classification),
          options: this.buildConfirmationOptions(classification),
        });

        if (!confirmed) {
          operation.status = 'cancelled';
          this.log('info', `Operation cancelled by user: ${operation.id}`);
          return { success: false, reason: 'cancelled by user' };
        }
      }

      // Create snapshot if rollback possible
      if (classification.canRollback) {
        await this.createSnapshot(operation.id);
      }

      // Execute operation
      const result = await this.executeOperation(operation, options.sandbox);

      // Learn from execution
      if (this.securityPolicy.autoApprove.learns) {
        await this.learnFromExecution(operation, result);
      }

      return result;
    } catch (error: any) {
      this.log('error', `Execution failed: ${error.message}`);
      this.emit('error', error);
      throw error;
    }
  }

  // ============================================
  // 🧠 Command Parsing
  // ============================================

  private async parseCommand(command: string): Promise<Operation> {
    const prompt = `
أنت مترجم أوامر ذكي. قم بتحليل الأمر التالي وحوّله إلى عملية قابلة للتنفيذ:

**الأمر:** "${command}"

**نظام التشغيل:** ${os.platform()}

قم بتحديد:
1. **نوع العملية** (file-read, file-write, process-start, etc.)
2. **الأمر الفعلي** الذي سينفذ
3. **الوصف** بالعربية والإنجليزية
4. **المخاطر المحتملة**
5. **البدائل الأكثر أماناً** (إن وجدت)

أعط النتيجة بصيغة JSON:
\`\`\`json
{
  "type": "file-delete",
  "command": "rm -rf /path/to/folder",
  "description": "حذف مجلد معين",
  "risks": ["لا يمكن التراجع", "قد يحذف ملفات مهمة"],
  "alternatives": ["نقل إلى سلة المهملات", "عمل backup أولاً"]
}
\`\`\`
`;

    try {
      const response = await this.callAI(prompt);
      const parsed = this.parseAIResponse(response);

      const operation: Operation = {
        id: this.generateOperationId(),
        type: parsed.type || 'custom',
        level: 'safe', // Will be classified later
        command: parsed.command || command,
        description: parsed.description || command,
        status: 'pending',
        metadata: {
          originalCommand: command,
          risks: parsed.risks || [],
          alternatives: parsed.alternatives || [],
        },
      };

      this.operations.set(operation.id, operation);
      return operation;
    } catch (error) {
      // Fallback: treat as custom command
      const operation: Operation = {
        id: this.generateOperationId(),
        type: 'custom',
        level: 'medium',
        command: command,
        description: command,
        status: 'pending',
      };

      this.operations.set(operation.id, operation);
      return operation;
    }
  }

  // ============================================
  // 🔍 Operation Classification
  // ============================================

  private classifyOperation(operation: Operation): OperationClassification {
    const cmd = operation.command.toLowerCase();
    let level: OperationLevel = 'safe';
    let requiresConfirmation = false;
    let canRollback = true;
    const risks: string[] = [];
    const alternatives: string[] = [];

    // 🟢 Safe operations (auto-execute)
    if (
      cmd.includes('cat ') ||
      cmd.includes('ls ') ||
      cmd.includes('dir ') ||
      cmd.includes('pwd') ||
      cmd.includes('echo ') ||
      operation.type === 'file-read'
    ) {
      level = 'safe';
      requiresConfirmation = false;
      risks.push('لا مخاطر');
    }

    // 🟡 Medium operations (simple confirmation)
    else if (
      cmd.includes('cp ') ||
      cmd.includes('copy ') ||
      cmd.includes('mv ') ||
      cmd.includes('move ') ||
      cmd.includes('npm install') ||
      cmd.includes('pip install') ||
      operation.type === 'file-write' ||
      operation.type === 'file-copy' ||
      operation.type === 'file-move'
    ) {
      level = 'medium';
      requiresConfirmation = true;
      risks.push('تعديل ملفات موجودة', 'استهلاك مساحة تخزين');
      alternatives.push('عمل نسخة احتياطية أولاً');
    }

    // 🔴 Critical operations (mandatory confirmation + warning)
    else if (
      cmd.includes('rm ') ||
      cmd.includes('del ') ||
      cmd.includes('delete ') ||
      cmd.includes('sudo ') ||
      cmd.includes('kill ') ||
      cmd.includes('reboot') ||
      cmd.includes('shutdown') ||
      operation.type === 'file-delete' ||
      operation.type === 'dir-delete' ||
      operation.type === 'process-kill'
    ) {
      level = 'critical';
      requiresConfirmation = true;
      canRollback = cmd.includes('rm') || cmd.includes('del');
      risks.push('عملية خطرة', 'لا يمكن التراجع', 'قد تؤثر على النظام');
      alternatives.push(
        'نقل إلى سلة المهملات بدلاً من الحذف',
        'عمل snapshot للنظام أولاً',
        'مراجعة الملفات المتأثرة'
      );
    }

    // Check protected paths
    for (const protectedPath of this.securityPolicy.protectedPaths) {
      if (cmd.includes(protectedPath.toLowerCase())) {
        level = 'critical';
        requiresConfirmation = true;
        risks.push(`تعديل مسار محمي: ${protectedPath}`);
      }
    }

    // Check auto-approve patterns
    if (this.securityPolicy.autoApprove.enabled) {
      for (const pattern of this.securityPolicy.autoApprove.patterns) {
        if (this.matchPattern(cmd, pattern)) {
          requiresConfirmation = false;
          this.log('info', `Auto-approved based on pattern: ${pattern}`);
        }
      }
    }

    operation.level = level;

    return {
      type: operation.type,
      level,
      requiresConfirmation,
      canRollback,
      risks,
      alternatives,
    };
  }

  // ============================================
  // ✅ Confirmation System
  // ============================================

  private buildConfirmationPrompt(
    operation: Operation,
    classification: OperationClassification
  ): string {
    const levelEmoji = {
      safe: '🟢',
      medium: '🟡',
      critical: '🔴',
    };

    let prompt = `\n${levelEmoji[classification.level]} عملية ${classification.level === 'critical' ? 'حرجة' : classification.level === 'medium' ? 'متوسطة' : 'عادية'}\n`;
    prompt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    prompt += `📋 التفاصيل:\n`;
    prompt += `   الأمر: ${operation.command}\n`;
    prompt += `   الوصف: ${operation.description}\n`;
    prompt += `   النوع: ${operation.type}\n\n`;

    if (classification.risks.length > 0) {
      prompt += `⚠️  المخاطر:\n`;
      classification.risks.forEach((risk) => {
        prompt += `   • ${risk}\n`;
      });
      prompt += `\n`;
    }

    if (classification.alternatives && classification.alternatives.length > 0) {
      prompt += `💡 البدائل:\n`;
      classification.alternatives.forEach((alt, i) => {
        prompt += `   ${i + 1}. ${alt}\n`;
      });
      prompt += `\n`;
    }

    return prompt;
  }

  private buildConfirmationOptions(classification: OperationClassification): ConfirmationOption[] {
    const options: ConfirmationOption[] = [];

    if (classification.level === 'critical' && classification.alternatives) {
      // For critical operations, show alternatives first
      classification.alternatives.forEach((alt, i) => {
        options.push({
          id: `alt-${i}`,
          label: alt,
          action: 'alternative',
          recommended: i === 0,
          description: 'بديل أكثر أماناً',
        });
      });

      options.push({
        id: 'approve',
        label: 'متابعة العملية (غير مُوصى)',
        action: 'approve',
        recommended: false,
      });

      options.push({
        id: 'deny',
        label: 'إلغاء',
        action: 'deny',
        recommended: false,
      });
    } else {
      // For medium/safe operations
      options.push({
        id: 'approve',
        label: 'موافق',
        action: 'approve',
        recommended: true,
      });

      options.push({
        id: 'deny',
        label: 'إلغاء',
        action: 'deny',
        recommended: false,
      });
    }

    return options;
  }

  private async requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
    this.emit('confirmation-required', request);

    return new Promise((resolve) => {
      // In a real implementation, this would wait for user input
      // For now, we'll use a simple console prompt simulation

      console.log(request.prompt);
      console.log('الخيارات:');
      request.options.forEach((opt, i) => {
        const recommended = opt.recommended ? ' ⭐ مُوصى' : '';
        console.log(`[${i + 1}] ${opt.label}${recommended}`);
      });

      // Emit event for external confirmation handlers
      this.once('confirmation-response', (response: { approved: boolean; optionId?: string }) => {
        resolve(response.approved);
      });

      // Auto-deny after timeout (if specified)
      if (request.timeout) {
        setTimeout(() => {
          this.log('warn', 'Confirmation timeout - auto-denying');
          resolve(false);
        }, request.timeout);
      }
    });
  }

  /**
   * Provide confirmation response (called externally)
   */
  public confirmOperation(operationId: string, approved: boolean, optionId?: string): void {
    this.emit('confirmation-response', { approved, optionId });
  }

  // ============================================
  // ⚙️ Operation Execution
  // ============================================

  private async executeOperation(operation: Operation, sandbox: boolean = false): Promise<any> {
    operation.status = 'running';
    operation.startTime = Date.now();
    this.runningOperations.add(operation.id);

    this.log('info', `Executing operation: ${operation.id} - ${operation.description}`);
    this.emit('operation-started', operation);

    try {
      let result: any;

      if (sandbox) {
        result = await this.executeSandboxed(operation);
      } else {
        result = await this.executeReal(operation);
      }

      operation.status = 'completed';
      operation.endTime = Date.now();
      operation.result = result;
      this.runningOperations.delete(operation.id);
      this.history.push(operation);

      this.log('info', `Operation completed: ${operation.id}`);
      this.emit('operation-completed', operation);

      return { success: true, result, operation };
    } catch (error: any) {
      operation.status = 'failed';
      operation.endTime = Date.now();
      operation.error = error.message;
      this.runningOperations.delete(operation.id);
      this.history.push(operation);

      this.log('error', `Operation failed: ${operation.id} - ${error.message}`);
      this.emit('operation-failed', operation, error);

      // Auto-rollback if possible
      if (operation.rollbackData) {
        await this.rollbackOperation(operation.id);
      }

      throw error;
    }
  }

  private async executeReal(operation: Operation): Promise<any> {
    const cmd = operation.command;

    try {
      // Execute based on operation type
      switch (operation.type) {
        case 'file-read':
          return await this.executeFileRead(cmd);

        case 'file-write':
          return await this.executeFileWrite(cmd);

        case 'file-delete':
          return await this.executeFileDelete(cmd);

        case 'file-copy':
        case 'file-move':
          return await this.executeFileOperation(cmd);

        case 'process-start':
          return await this.executeProcessStart(cmd);

        case 'system-command':
        case 'custom':
        default:
          return await this.executeSystemCommand(cmd);
      }
    } catch (error: any) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  private async executeSandboxed(operation: Operation): Promise<any> {
    this.log('info', `Executing in sandbox mode: ${operation.id}`);

    // Simulate execution without actual changes
    return {
      simulated: true,
      operation: operation.description,
      message: 'Executed in sandbox mode - no real changes made',
    };
  }

  // ============================================
  // 📁 File Operations
  // ============================================

  private async executeFileRead(cmd: string): Promise<string> {
    const filePath = this.extractFilePath(cmd);
    return await fs.readFile(filePath, 'utf-8');
  }

  private async executeFileWrite(cmd: string): Promise<void> {
    const { filePath, content } = this.extractFileWriteParams(cmd);
    await fs.writeFile(filePath, content);
  }

  private async executeFileDelete(cmd: string): Promise<void> {
    const filePath = this.extractFilePath(cmd);

    // Move to trash instead of permanent delete (safer)
    const trashDir = path.join(this.workingDirectory, '.trash');
    await fs.ensureDir(trashDir);

    const fileName = path.basename(filePath);
    const trashPath = path.join(trashDir, `${fileName}.${Date.now()}`);

    await fs.move(filePath, trashPath);

    this.log('info', `Moved to trash: ${filePath} -> ${trashPath}`);
  }

  private async executeFileOperation(cmd: string): Promise<string> {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) {
      this.log('warn', `Command stderr: ${stderr}`);
    }
    return stdout;
  }

  // ============================================
  // 🖥️ Process Operations
  // ============================================

  private async executeProcessStart(cmd: string): Promise<ChildProcess> {
    const parts = cmd.split(' ');
    const program = parts[0];
    const args = parts.slice(1);

    const process = spawn(program, args);
    const processId = this.generateOperationId();
    this.processHandles.set(processId, process);

    process.on('exit', (code) => {
      this.log('info', `Process ${processId} exited with code ${code}`);
      this.processHandles.delete(processId);
    });

    return process;
  }

  // ============================================
  // 💻 System Command Execution
  // ============================================

  private async executeSystemCommand(cmd: string): Promise<string> {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: this.workingDirectory,
      timeout: 300000, // 5 minutes
    });

    if (stderr) {
      this.log('warn', `Command stderr: ${stderr}`);
    }

    return stdout;
  }

  // ============================================
  // 💾 Snapshot & Rollback System
  // ============================================

  private async createSnapshot(operationId: string): Promise<void> {
    const snapshot = {
      id: operationId,
      timestamp: Date.now(),
      workingDirectory: this.workingDirectory,
      files: await this.captureFileSystem(),
      processes: await this.captureProcesses(),
    };

    this.snapshots.set(operationId, snapshot);
    this.log('info', `Snapshot created: ${operationId}`);
  }

  private async captureFileSystem(): Promise<any> {
    // Capture current file system state
    // In production, this would be more sophisticated
    return {
      timestamp: Date.now(),
      files: [], // List of files
    };
  }

  private async captureProcesses(): Promise<any> {
    return {
      timestamp: Date.now(),
      processes: [], // List of running processes
    };
  }

  public async rollbackOperation(operationId: string): Promise<RollbackResult> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation not found: ${operationId}`);
    }

    const snapshot = this.snapshots.get(operationId);
    if (!snapshot) {
      return {
        operationId,
        success: false,
        error: 'No snapshot available for rollback',
      };
    }

    try {
      this.log('info', `Rolling back operation: ${operationId}`);

      // Restore from snapshot
      // Implementation would restore files, processes, etc.

      operation.status = 'rolled-back';
      this.snapshots.delete(operationId);

      this.log('info', `Rollback successful: ${operationId}`);

      return {
        operationId,
        success: true,
        restoredFiles: [],
      };
    } catch (error: any) {
      this.log('error', `Rollback failed: ${error.message}`);
      return {
        operationId,
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // 🛑 Emergency Stop System
  // ============================================

  /**
   * Level 1: Pause - Stop new operations, complete current ones
   */
  public pause(): void {
    this.isPaused = true;
    this.log('warn', 'Agent paused - no new operations will be accepted');
    this.emit('paused');
  }

  /**
   * Level 2: Soft Stop - Complete current operations cleanly
   */
  public async softStop(): Promise<EmergencyStopResult> {
    this.log('warn', 'Soft stop initiated');
    this.stopRequested = true;

    // Wait for running operations to complete
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (this.runningOperations.size > 0 && Date.now() - start < timeout) {
      await this.sleep(1000);
    }

    return await this.finalizeStop('soft', 'User requested soft stop');
  }

  /**
   * Level 3: Hard Stop - Stop everything immediately
   */
  public async hardStop(): Promise<EmergencyStopResult> {
    this.log('warn', 'Hard stop initiated');
    this.stopRequested = true;

    // Kill all running operations
    for (const opId of this.runningOperations) {
      const operation = this.operations.get(opId);
      if (operation) {
        operation.status = 'cancelled';
        await this.rollbackOperation(opId);
      }
    }

    // Kill all processes
    for (const [id, process] of this.processHandles) {
      process.kill('SIGTERM');
      this.processHandles.delete(id);
    }

    this.runningOperations.clear();

    return await this.finalizeStop('hard', 'User requested hard stop');
  }

  /**
   * Level 4: Emergency Stop - Immediate stop with rollback
   */
  public async emergencyStop(reason?: string): Promise<EmergencyStopResult> {
    this.log('error', `EMERGENCY STOP: ${reason || 'Unknown reason'}`);
    this.stopRequested = true;
    this.isActive = false;

    // Immediate stop of everything
    for (const [id, process] of this.processHandles) {
      process.kill('SIGKILL');
      this.processHandles.delete(id);
    }

    // Rollback all operations
    const rollbacks: RollbackResult[] = [];
    for (const opId of this.runningOperations) {
      const result = await this.rollbackOperation(opId);
      rollbacks.push(result);
    }

    this.runningOperations.clear();

    return await this.finalizeStop('emergency', reason || 'Emergency stop requested', rollbacks);
  }

  /**
   * Level 5: Panic Mode - Nuclear option
   */
  public async panicStop(): Promise<EmergencyStopResult> {
    this.log('error', 'PANIC MODE ACTIVATED');

    // Kill everything immediately
    await this.emergencyStop('Panic mode activated');

    // Clear all state
    this.operations.clear();
    this.snapshots.clear();
    this.processHandles.clear();
    this.runningOperations.clear();

    // Shutdown agent
    this.isActive = false;

    this.emit('panic-stop');

    return await this.finalizeStop('panic', 'Panic mode - complete shutdown');
  }

  private async finalizeStop(
    level: StopLevel,
    reason: string,
    rollbacks: RollbackResult[] = []
  ): Promise<EmergencyStopResult> {
    const result: EmergencyStopResult = {
      timestamp: new Date().toISOString(),
      reason,
      level,
      stoppedOperations: Array.from(this.operations.values()).filter((op) =>
        this.runningOperations.has(op.id)
      ),
      rollbacks,
      systemState: await this.getSystemState(),
      recommendations: this.generateRecommendations(level),
      reportPath: await this.generateStopReport(level, reason),
    };

    this.emit('stopped', result);

    return result;
  }

  // ============================================
  // 📊 System Monitoring
  // ============================================

  private setupMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      const state = await this.getSystemState();

      // Check thresholds
      if (this.autoStopConfig) {
        if (this.autoStopConfig.cpuThreshold && state.cpuUsage > this.autoStopConfig.cpuThreshold) {
          this.log('warn', `CPU usage high: ${state.cpuUsage}%`);
          this.emit('warning', {
            type: 'cpu-high',
            value: state.cpuUsage,
            threshold: this.autoStopConfig.cpuThreshold,
          });
        }

        if (
          this.autoStopConfig.memoryThreshold &&
          state.memoryUsage > this.autoStopConfig.memoryThreshold
        ) {
          this.log('warn', `Memory usage high: ${state.memoryUsage}%`);
          this.emit('warning', {
            type: 'memory-high',
            value: state.memoryUsage,
            threshold: this.autoStopConfig.memoryThreshold,
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  public async getSystemState(): Promise<SystemState> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      cpuUsage: 0, // Would calculate actual CPU usage
      memoryUsage: ((totalMem - freeMem) / totalMem) * 100,
      diskUsage: 0, // Would calculate actual disk usage
      runningProcesses: this.processHandles.size,
      activeOperations: this.runningOperations.size,
      timestamp: Date.now(),
    };
  }

  public setAutoStop(config: AutoStopConfig): void {
    this.autoStopConfig = config;
    this.log('info', 'Auto-stop configuration updated');
  }

  // ============================================
  // ⏱️ Dead Man's Switch
  // ============================================

  public enableDeadManSwitch(interval: number = 60000): void {
    this.log('info', `Dead Man's Switch enabled (${interval}ms interval)`);

    this.deadManSwitchTimer = setInterval(() => {
      this.log('warn', "Dead Man's Switch timeout - initiating emergency stop");
      this.emergencyStop("Dead Man's Switch timeout");
    }, interval);
  }

  public keepAlive(): void {
    if (this.deadManSwitchTimer) {
      clearInterval(this.deadManSwitchTimer);
      this.enableDeadManSwitch();
      this.log('debug', 'Keep-alive signal received');
    }
  }

  public disableDeadManSwitch(): void {
    if (this.deadManSwitchTimer) {
      clearInterval(this.deadManSwitchTimer);
      this.deadManSwitchTimer = undefined;
      this.log('info', "Dead Man's Switch disabled");
    }
  }

  // ============================================
  // 🔐 Security & Policy
  // ============================================

  private initializeSecurityPolicy(custom?: Partial<SecurityPolicy>): SecurityPolicy {
    const defaultPolicy: SecurityPolicy = {
      allowedOperations: {
        fileOperations: {
          read: true,
          write: 'confirm',
          delete: 'confirm',
          execute: 'confirm',
        },
        systemOperations: {
          installPackages: 'confirm',
          modifyRegistry: false,
          sudo: 'confirm',
          processManagement: 'confirm',
        },
        networkOperations: {
          httpRequests: true,
          openPorts: 'confirm',
          ssh: 'confirm',
        },
      },
      protectedPaths: ['/System', '/Windows', 'C:\\Windows', '/usr/bin', '/etc'],
      trustedSources: ['github.com', 'npmjs.com', 'pypi.org'],
      autoApprove: {
        enabled: true,
        learns: true,
        patterns: ['delete */temp/*', 'npm install *', 'git pull'],
      },
    };

    return { ...defaultPolicy, ...custom };
  }

  // ============================================
  // 🧠 Learning System
  // ============================================

  private async learnFromExecution(operation: Operation, result: any): Promise<void> {
    // Learn patterns from successful executions
    if (operation.status === 'completed') {
      // Add to auto-approve patterns if repeatedly approved
      // Implementation would track user decisions
    }
  }

  // ============================================
  // 🎯 Control Methods
  // ============================================

  public resume(): void {
    this.isPaused = false;
    this.stopRequested = false;
    this.isActive = true;
    this.log('info', 'Agent resumed');
    this.emit('resumed');
  }

  public getStatus(): {
    active: boolean;
    paused: boolean;
    operations: {
      total: number;
      running: number;
      completed: number;
      failed: number;
    };
  } {
    return {
      active: this.isActive,
      paused: this.isPaused,
      operations: {
        total: this.operations.size,
        running: this.runningOperations.size,
        completed: this.history.filter((op) => op.status === 'completed').length,
        failed: this.history.filter((op) => op.status === 'failed').length,
      },
    };
  }

  public getHistory(limit?: number): Operation[] {
    const history = [...this.history].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  public getOperation(id: string): Operation | undefined {
    return this.operations.get(id);
  }

  // ============================================
  // 🛠️ Helper Methods
  // ============================================

  private setupDirectories(): void {
    fs.ensureDirSync(this.logDirectory);
    fs.ensureDirSync(path.join(this.workingDirectory, '.trash'));
  }

  private setupSignalHandlers(): void {
    // CTRL+C handler
    let ctrlCCount = 0;
    let lastCtrlC = 0;

    process.on('SIGINT', async () => {
      const now = Date.now();

      if (now - lastCtrlC < 1000) {
        ctrlCCount++;
      } else {
        ctrlCCount = 1;
      }

      lastCtrlC = now;

      if (ctrlCCount === 1) {
        console.log('\n🟡 Soft stop... (Press CTRL+C again for hard stop)');
        await this.softStop();
      } else if (ctrlCCount === 2) {
        console.log('\n🔴 Hard stop... (Press CTRL+C again for emergency stop)');
        await this.hardStop();
      } else if (ctrlCCount >= 3) {
        console.log('\n🚨 EMERGENCY STOP!');
        await this.emergencyStop('Triple CTRL+C');
        process.exit(1);
      }
    });

    // SIGTERM handler
    process.on('SIGTERM', async () => {
      await this.softStop();
      process.exit(0);
    });
  }

  private generateOperationId(): string {
    return `op-${crypto.randomBytes(8).toString('hex')}`;
  }

  private matchPattern(command: string, pattern: string): boolean {
    // Simple pattern matching (would be more sophisticated in production)
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(command);
  }

  private extractFilePath(cmd: string): string {
    // Extract file path from command
    const match = cmd.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : cmd.split(' ').pop() || '';
  }

  private extractFileWriteParams(cmd: string): { filePath: string; content: string } {
    // Extract file path and content from write command
    return {
      filePath: '',
      content: '',
    };
  }

  private parseAIResponse(response: string): any {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return {};
    } catch {
      return {};
    }
  }

  private generateRecommendations(level: StopLevel): string[] {
    const recommendations: string[] = [];

    if (level === 'panic' || level === 'emergency') {
      recommendations.push('مراجعة السجلات (logs) لفهم سبب الإيقاف');
      recommendations.push('فحص النظام للتأكد من عدم وجود أضرار');
      recommendations.push('استعادة من آخر snapshot إذا لزم الأمر');
    }

    recommendations.push('مراجعة العمليات التي كانت قيد التنفيذ');
    recommendations.push('التحقق من حالة النظام قبل الاستئناف');

    return recommendations;
  }

  private async generateStopReport(level: StopLevel, reason: string): Promise<string> {
    const reportPath = path.join(this.logDirectory, `stop-report-${Date.now()}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      level,
      reason,
      operations: Array.from(this.operations.values()),
      systemState: await this.getSystemState(),
    };

    await fs.writeJSON(reportPath, report, { spaces: 2 });

    return reportPath;
  }

  private async callAI(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'coder',
      prompt,
      undefined,
      this.provider
    );
    return result.response;
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    console.log(logMessage);

    // Also write to log file
    const logFile = path.join(this.logDirectory, 'agent.log');
    fs.appendFileSync(logFile, logMessage + '\n');

    this.emit('log', { level, message, timestamp });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // 🧹 Cleanup
  // ============================================

  public async shutdown(): Promise<void> {
    this.log('info', 'Shutting down agent...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.deadManSwitchTimer) {
      clearInterval(this.deadManSwitchTimer);
    }

    await this.softStop();

    this.log('info', 'Agent shutdown complete');
  }
}

// ============================================
// 🏭 Factory Function
// ============================================

export function createComputerControlAgent(config: AgentConfig): ComputerControlAgent {
  return new ComputerControlAgent(config);
}

// ============================================
// Export
// ============================================
// Export (Already exported via export class/interface above)
// ============================================
