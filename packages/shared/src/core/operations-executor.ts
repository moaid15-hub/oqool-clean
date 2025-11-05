// operations-executor.ts
// ============================================
// ⚙️ Operations Executor - منفذ العمليات المتقدم
// ============================================
// Advanced operations execution with full cross-platform support
// ============================================

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import os from 'os';
import axios from 'axios';

const execAsync = promisify(exec);

// ============================================
// 📊 Types & Interfaces
// ============================================

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface FileOperationOptions {
  overwrite?: boolean;
  backup?: boolean;
  permissions?: string | number;
}

export interface ProcessOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  detached?: boolean;
}

export interface NetworkRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface GitOperationOptions {
  branch?: string;
  remote?: string;
  message?: string;
  author?: string;
}

export interface DockerOperationOptions {
  image?: string;
  container?: string;
  ports?: string[];
  volumes?: string[];
  env?: Record<string, string>;
}

export interface DatabaseOperationOptions {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  query?: string;
}

// ============================================
// ⚙️ Operations Executor Class
// ============================================

export class OperationsExecutor {
  private platform: NodeJS.Platform;
  private workingDir: string;

  constructor(workingDir?: string) {
    this.platform = os.platform();
    this.workingDir = workingDir || process.cwd();
  }

  // ============================================
  // 📁 File Operations
  // ============================================

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');

      return {
        success: true,
        output: content,
        duration: Date.now() - start,
        metadata: {
          path: fullPath,
          size: content.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Write file content
   */
  async writeFile(
    filePath: string,
    content: string,
    options: FileOperationOptions = {}
  ): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, filePath);

      // Backup if requested
      if (options.backup && (await fs.pathExists(fullPath))) {
        await fs.copy(fullPath, `${fullPath}.backup`);
      }

      // Check overwrite
      if (!options.overwrite && (await fs.pathExists(fullPath))) {
        return {
          success: false,
          error: 'File exists and overwrite is false',
          duration: Date.now() - start,
        };
      }

      await fs.writeFile(fullPath, content);

      // Set permissions if specified
      if (options.permissions) {
        await fs.chmod(fullPath, options.permissions);
      }

      return {
        success: true,
        output: `File written: ${fullPath}`,
        duration: Date.now() - start,
        metadata: {
          path: fullPath,
          size: content.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Delete file or directory
   */
  async delete(targetPath: string, moveToTrash: boolean = true): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, targetPath);

      if (!(await fs.pathExists(fullPath))) {
        return {
          success: false,
          error: 'Path does not exist',
          duration: Date.now() - start,
        };
      }

      if (moveToTrash) {
        // Move to trash directory
        const trashDir = path.join(this.workingDir, '.trash');
        await fs.ensureDir(trashDir);

        const fileName = path.basename(fullPath);
        const trashPath = path.join(trashDir, `${fileName}.${Date.now()}`);

        await fs.move(fullPath, trashPath);

        return {
          success: true,
          output: `Moved to trash: ${trashPath}`,
          duration: Date.now() - start,
          metadata: {
            originalPath: fullPath,
            trashPath,
            canRestore: true,
          },
        };
      } else {
        // Permanent delete
        await fs.remove(fullPath);

        return {
          success: true,
          output: `Deleted: ${fullPath}`,
          duration: Date.now() - start,
          metadata: {
            path: fullPath,
            permanent: true,
          },
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Copy file or directory
   */
  async copy(
    source: string,
    destination: string,
    options: FileOperationOptions = {}
  ): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const sourcePath = path.resolve(this.workingDir, source);
      const destPath = path.resolve(this.workingDir, destination);

      if (!options.overwrite && (await fs.pathExists(destPath))) {
        return {
          success: false,
          error: 'Destination exists and overwrite is false',
          duration: Date.now() - start,
        };
      }

      await fs.copy(sourcePath, destPath, { overwrite: options.overwrite });

      return {
        success: true,
        output: `Copied: ${sourcePath} -> ${destPath}`,
        duration: Date.now() - start,
        metadata: {
          source: sourcePath,
          destination: destPath,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Move file or directory
   */
  async move(
    source: string,
    destination: string,
    options: FileOperationOptions = {}
  ): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const sourcePath = path.resolve(this.workingDir, source);
      const destPath = path.resolve(this.workingDir, destination);

      if (!options.overwrite && (await fs.pathExists(destPath))) {
        return {
          success: false,
          error: 'Destination exists and overwrite is false',
          duration: Date.now() - start,
        };
      }

      await fs.move(sourcePath, destPath, { overwrite: options.overwrite });

      return {
        success: true,
        output: `Moved: ${sourcePath} -> ${destPath}`,
        duration: Date.now() - start,
        metadata: {
          source: sourcePath,
          destination: destPath,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, dirPath);
      const files = await fs.readdir(fullPath);

      const details = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file);
          const stats = await fs.stat(filePath);

          return {
            name: file,
            path: filePath,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            size: stats.size,
            modified: stats.mtime,
            permissions: stats.mode,
          };
        })
      );

      return {
        success: true,
        output: details,
        duration: Date.now() - start,
        metadata: {
          path: fullPath,
          count: files.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  // ============================================
  // 🔧 Process Operations
  // ============================================

  /**
   * Start a process
   */
  async startProcess(
    command: string,
    args: string[] = [],
    options: ProcessOptions = {}
  ): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const childProcess = spawn(command, args, {
        cwd: options.cwd || this.workingDir,
        env: { ...process.env, ...options.env },
        detached: options.detached,
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout?.on('data', (data: any) => {
        output += data.toString();
      });

      childProcess.stderr?.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      return new Promise((resolve) => {
        const timeout = options.timeout || 300000; // 5 minutes default
        const timer = setTimeout(() => {
          childProcess.kill();
          resolve({
            success: false,
            error: 'Process timeout',
            duration: Date.now() - start,
          });
        }, timeout);

        childProcess.on('close', (code: any) => {
          clearTimeout(timer);
          resolve({
            success: code === 0,
            output: output || errorOutput,
            error: code !== 0 ? errorOutput : undefined,
            duration: Date.now() - start,
            metadata: {
              exitCode: code,
              pid: process.pid,
            },
          });
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Kill a process
   */
  async killProcess(pid: number, force: boolean = false): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const signal = force ? 'SIGKILL' : 'SIGTERM';
      process.kill(pid, signal);

      return {
        success: true,
        output: `Process ${pid} killed with ${signal}`,
        duration: Date.now() - start,
        metadata: { pid, signal },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Execute shell command
   */
  async executeCommand(command: string, options: ProcessOptions = {}): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: options.cwd || this.workingDir,
        env: { ...process.env, ...options.env },
        timeout: options.timeout || 300000,
      });

      return {
        success: true,
        output: stdout || stderr,
        duration: Date.now() - start,
        metadata: {
          command,
          hasStderr: !!stderr,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: error.stdout,
        duration: Date.now() - start,
      };
    }
  }

  // ============================================
  // 🌐 Network Operations
  // ============================================

  /**
   * HTTP Request
   */
  async httpRequest(url: string, options: NetworkRequestOptions = {}): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers: options.headers,
        data: options.body,
        timeout: options.timeout || 30000,
      });

      return {
        success: true,
        output: response.data,
        duration: Date.now() - start,
        metadata: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
        metadata: {
          status: error.response?.status,
          statusText: error.response?.statusText,
        },
      };
    }
  }

  /**
   * Download file
   */
  async downloadFile(url: string, destination: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      const destPath = path.resolve(this.workingDir, destination);
      const writer = fs.createWriteStream(destPath);

      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => {
          resolve({
            success: true,
            output: `Downloaded: ${destPath}`,
            duration: Date.now() - start,
            metadata: {
              url,
              destination: destPath,
              size: response.headers['content-length'],
            },
          });
        });

        writer.on('error', (error) => {
          resolve({
            success: false,
            error: error.message,
            duration: Date.now() - start,
          });
        });
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  // ============================================
  // 🔧 Git Operations
  // ============================================

  /**
   * Git clone
   */
  async gitClone(repository: string, destination?: string): Promise<ExecutionResult> {
    const dest = destination || path.basename(repository, '.git');
    return await this.executeCommand(`git clone ${repository} ${dest}`);
  }

  /**
   * Git pull
   */
  async gitPull(options: GitOperationOptions = {}): Promise<ExecutionResult> {
    const remote = options.remote || 'origin';
    const branch = options.branch || 'main';
    return await this.executeCommand(`git pull ${remote} ${branch}`);
  }

  /**
   * Git commit
   */
  async gitCommit(message: string, options: GitOperationOptions = {}): Promise<ExecutionResult> {
    const author = options.author ? `--author="${options.author}"` : '';
    return await this.executeCommand(`git commit ${author} -m "${message}"`);
  }

  /**
   * Git push
   */
  async gitPush(options: GitOperationOptions = {}): Promise<ExecutionResult> {
    const remote = options.remote || 'origin';
    const branch = options.branch || 'main';
    return await this.executeCommand(`git push ${remote} ${branch}`);
  }

  /**
   * Git status
   */
  async gitStatus(): Promise<ExecutionResult> {
    return await this.executeCommand('git status');
  }

  // ============================================
  // 🐳 Docker Operations
  // ============================================

  /**
   * Docker run
   */
  async dockerRun(options: DockerOperationOptions): Promise<ExecutionResult> {
    if (!options.image) {
      return {
        success: false,
        error: 'Image is required',
        duration: 0,
      };
    }

    let command = `docker run`;

    if (options.ports) {
      options.ports.forEach((port) => {
        command += ` -p ${port}`;
      });
    }

    if (options.volumes) {
      options.volumes.forEach((vol) => {
        command += ` -v ${vol}`;
      });
    }

    if (options.env) {
      Object.entries(options.env).forEach(([key, value]) => {
        command += ` -e ${key}=${value}`;
      });
    }

    command += ` ${options.image}`;

    return await this.executeCommand(command);
  }

  /**
   * Docker stop
   */
  async dockerStop(container: string): Promise<ExecutionResult> {
    return await this.executeCommand(`docker stop ${container}`);
  }

  /**
   * Docker list containers
   */
  async dockerPs(): Promise<ExecutionResult> {
    return await this.executeCommand('docker ps -a');
  }

  /**
   * Docker list images
   */
  async dockerImages(): Promise<ExecutionResult> {
    return await this.executeCommand('docker images');
  }

  // ============================================
  // 📦 Package Management
  // ============================================

  /**
   * NPM install
   */
  async npmInstall(packages?: string[], global: boolean = false): Promise<ExecutionResult> {
    const pkgs = packages ? packages.join(' ') : '';
    const flag = global ? '-g' : '';
    return await this.executeCommand(`npm install ${flag} ${pkgs}`);
  }

  /**
   * NPM uninstall
   */
  async npmUninstall(packages: string[], global: boolean = false): Promise<ExecutionResult> {
    const pkgs = packages.join(' ');
    const flag = global ? '-g' : '';
    return await this.executeCommand(`npm uninstall ${flag} ${pkgs}`);
  }

  /**
   * Pip install
   */
  async pipInstall(packages: string[]): Promise<ExecutionResult> {
    const pkgs = packages.join(' ');
    return await this.executeCommand(`pip install ${pkgs}`);
  }

  /**
   * Pip uninstall
   */
  async pipUninstall(packages: string[]): Promise<ExecutionResult> {
    const pkgs = packages.join(' ');
    return await this.executeCommand(`pip uninstall -y ${pkgs}`);
  }

  // ============================================
  // 🛠️ System Operations
  // ============================================

  /**
   * Get system info
   */
  async getSystemInfo(): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const info = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        nodeVersion: process.version,
      };

      return {
        success: true,
        output: info,
        duration: Date.now() - start,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, dirPath);
      await fs.ensureDir(fullPath);

      return {
        success: true,
        output: `Directory created: ${fullPath}`,
        duration: Date.now() - start,
        metadata: { path: fullPath },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Check if path exists
   */
  async pathExists(targetPath: string): Promise<ExecutionResult> {
    const start = Date.now();

    try {
      const fullPath = path.resolve(this.workingDir, targetPath);
      const exists = await fs.pathExists(fullPath);

      return {
        success: true,
        output: exists,
        duration: Date.now() - start,
        metadata: { path: fullPath, exists },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - start,
      };
    }
  }

  // ============================================
  // 🛠️ Utility Methods
  // ============================================

  public setWorkingDirectory(dir: string): void {
    this.workingDir = dir;
  }

  public getWorkingDirectory(): string {
    return this.workingDir;
  }

  public getPlatform(): NodeJS.Platform {
    return this.platform;
  }
}

// ============================================
// 🏭 Factory Function
// ============================================

export function createOperationsExecutor(workingDir?: string): OperationsExecutor {
  return new OperationsExecutor(workingDir);
}

// ============================================
// Export (Already exported via export class/interface above)
// ============================================
