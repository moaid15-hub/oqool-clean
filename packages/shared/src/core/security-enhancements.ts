// security-enhancements.ts
// ============================================
// 🔐 تحسينات الأمان المتقدمة
// ============================================

import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OqoolAPIClient } from './api-client.js';

const execAsync = promisify(exec);

export interface SecurityConfig {
  enabled: boolean;
  scanOnGenerate: boolean;
  scanOnExecute: boolean;
  blockMalicious: boolean;
  allowedCommands: string[];
  blockedPatterns: string[];
  maxFileSize: number; // MB
  allowedExtensions: string[];
  encryptionKey?: string;
}

export interface SecurityScanResult {
  safe: boolean;
  issues: SecurityVulnerability[];
  score: number; // 0-100
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: 'malicious' | 'vulnerable' | 'suspicious' | 'policy';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  description: string;
  cwe?: string;
  fix?: string;
}

export interface CodeSign {
  hash: string;
  algorithm: string;
  timestamp: string;
  author: string;
  verified: boolean;
}

export class SecurityEnhancements {
  private config: SecurityConfig;
  private apiClient: OqoolAPIClient;
  private workingDir: string;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.workingDir = workingDir;
    this.config = this.loadDefaultConfig();
  }

  /**
   * تحميل التكوين الافتراضي
   */
  private loadDefaultConfig(): SecurityConfig {
    return {
      enabled: true,
      scanOnGenerate: true,
      scanOnExecute: true,
      blockMalicious: true,
      allowedCommands: [
        'node',
        'npm',
        'yarn',
        'pnpm',
        'git',
        'docker',
        'python',
        'pip',
        'go',
        'cargo',
        'rustc',
        'ruby',
        'php',
        'composer',
        'java',
        'javac',
        'mvn',
        'gradle',
      ],
      blockedPatterns: [
        'eval\\(',
        'Function\\(',
        'setTimeout\\(.*eval',
        'child_process\\.exec',
        'child_process\\.spawn',
        'fs\\.writeFileSync.*process\\.env',
        'require\\(.*http',
        'process\\.env\\.[A-Z_]+.*=.*',
        'Buffer\\.from.*base64',
        'crypto\\.createCipher',
        'os\\.tmpdir',
        'path\\.join.*\\.\\.',
        'fs\\.readFileSync.*\\*',
        'execSync\\(',
        'spawnSync\\(',
      ],
      maxFileSize: 10, // 10MB
      allowedExtensions: [
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
        '.md',
        '.html',
        '.css',
        '.scss',
        '.less',
        '.txt',
        '.py',
        '.go',
        '.rs',
        '.rb',
        '.php',
        '.java',
        '.xml',
        '.yml',
        '.yaml',
        '.toml',
        '.ini',
        '.sh',
        '.bat',
        '.ps1',
        '.sql',
      ],
    };
  }

  /**
   * فحص الأمان للكود المُولد
   */
  async scanGeneratedCode(code: string, fileName: string): Promise<SecurityScanResult> {
    if (!this.config.enabled || !this.config.scanOnGenerate) {
      return { safe: true, issues: [], score: 100, recommendations: [] };
    }

    const issues: SecurityVulnerability[] = [];
    let score = 100;

    // فحص الأنماط الممنوعة
    for (const pattern of this.config.blockedPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = code.match(regex);

      if (matches) {
        issues.push({
          type: 'malicious',
          severity: 'high',
          file: fileName,
          description: `استخدام نمط محظور: ${pattern}`,
          cwe: 'CWE-79',
          fix: 'إزالة أو تعديل النمط المحظور',
        });
        score -= 20;
      }
    }

    // فحص أوامر النظام
    if (this.containsSystemCommands(code)) {
      issues.push({
        type: 'vulnerable',
        severity: 'medium',
        file: fileName,
        description: 'استخدام أوامر نظام قد تكون خطيرة',
        cwe: 'CWE-78',
        fix: 'استخدام APIs آمنة بدلاً من أوامر النظام',
      });
      score -= 15;
    }

    // فحص المنافذ المفتوحة
    if (this.containsOpenPorts(code)) {
      issues.push({
        type: 'vulnerable',
        severity: 'high',
        file: fileName,
        description: 'فتح منفذ قد يكون خطيراً',
        cwe: 'CWE-200',
        fix: 'التأكد من إغلاق المنافذ غير الضرورية',
      });
      score -= 25;
    }

    // فحص المتغيرات البيئية
    if (this.containsEnvAccess(code)) {
      issues.push({
        type: 'policy',
        severity: 'medium',
        file: fileName,
        description: 'الوصول لمتغيرات البيئة',
        fix: 'التأكد من صلاحية الوصول',
      });
      score -= 10;
    }

    // فحص التشفير
    if (this.containsInsecureCrypto(code)) {
      issues.push({
        type: 'vulnerable',
        severity: 'high',
        file: fileName,
        description: 'استخدام تشفير غير آمن',
        cwe: 'CWE-327',
        fix: 'استخدام خوارزميات تشفير حديثة وآمنة',
      });
      score -= 20;
    }

    // فحص التحقق من المدخلات
    if (!this.hasInputValidation(code)) {
      issues.push({
        type: 'vulnerable',
        severity: 'medium',
        file: fileName,
        description: 'عدم وجود تحقق من المدخلات',
        cwe: 'CWE-20',
        fix: 'إضافة تحقق من صحة المدخلات',
      });
      score -= 15;
    }

    const recommendations = this.generateRecommendations(issues);

    return {
      safe: issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      score: Math.max(0, score),
      recommendations,
    };
  }

  /**
   * فحص الأمان قبل التنفيذ
   */
  async scanBeforeExecution(filePath: string): Promise<SecurityScanResult> {
    if (!this.config.enabled || !this.config.scanOnExecute) {
      return { safe: true, issues: [], score: 100, recommendations: [] };
    }

    try {
      const stats = await fs.stat(filePath);

      // فحص حجم الملف
      if (stats.size > this.config.maxFileSize * 1024 * 1024) {
        return {
          safe: false,
          issues: [
            {
              type: 'policy',
              severity: 'high',
              file: filePath,
              description: `حجم الملف كبير جداً: ${(stats.size / 1024 / 1024).toFixed(2)}MB`,
            },
          ],
          score: 0,
          recommendations: ['تقسيم الملف إلى أجزاء أصغر'],
        };
      }

      // فحص امتداد الملف
      const ext = path.extname(filePath);
      if (!this.config.allowedExtensions.includes(ext)) {
        return {
          safe: false,
          issues: [
            {
              type: 'policy',
              severity: 'high',
              file: filePath,
              description: `امتداد ملف غير مسموح: ${ext}`,
            },
          ],
          score: 0,
          recommendations: ['استخدام امتداد ملف مسموح'],
        };
      }

      // قراءة محتوى الملف
      const content = await fs.readFile(filePath, 'utf8');

      // فحص الأمان الأساسي
      const basicScan = await this.scanGeneratedCode(content, filePath);

      // فحص إضافي للملفات القابلة للتنفيذ
      if (this.isExecutableFile(filePath)) {
        const execScan = await this.scanExecutableFile(content, filePath);
        basicScan.issues.push(...execScan.issues);
        basicScan.score = Math.min(basicScan.score, execScan.score);
      }

      return basicScan;
    } catch (error) {
      return {
        safe: false,
        issues: [
          {
            type: 'policy',
            severity: 'critical',
            file: filePath,
            description: `خطأ في قراءة الملف: ${error}`,
          },
        ],
        score: 0,
        recommendations: ['التأكد من إمكانية قراءة الملف'],
      };
    }
  }

  /**
   * توقيع الكود رقمياً
   */
  async signCode(filePath: string, author: string): Promise<CodeSign> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');

      const signature: CodeSign = {
        hash,
        algorithm: 'SHA-256',
        timestamp: new Date().toISOString(),
        author,
        verified: true,
      };

      // حفظ التوقيع
      const signaturePath = `${filePath}.sig`;
      await fs.writeJson(signaturePath, signature, { spaces: 2 });

      console.log(chalk.green(`✅ تم توقيع الكود: ${hash.substring(0, 8)}...`));

      return signature;
    } catch (error) {
      console.error(chalk.red('❌ فشل في توقيع الكود:'), error);
      throw error;
    }
  }

  /**
   * التحقق من توقيع الكود
   */
  async verifyCodeSignature(filePath: string): Promise<boolean> {
    try {
      const signaturePath = `${filePath}.sig`;

      if (!(await fs.pathExists(signaturePath))) {
        return false;
      }

      const signature: CodeSign = await fs.readJson(signaturePath);
      const content = await fs.readFile(filePath, 'utf8');
      const currentHash = crypto.createHash('sha256').update(content).digest('hex');

      return signature.hash === currentHash && signature.verified;
    } catch (error) {
      console.error(chalk.red('❌ فشل في التحقق من التوقيع:'), error);
      return false;
    }
  }

  /**
   * تشفير الملفات الحساسة
   */
  async encryptSensitiveFile(filePath: string, key?: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const encryptionKey = key || this.generateEncryptionKey();

      // تشفير المحتوى
      const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // حفظ الملف المشفر
      const encryptedPath = `${filePath}.encrypted`;
      await fs.writeFile(encryptedPath, encrypted);

      // حفظ مفتاح التشفير
      const keyPath = `${filePath}.key`;
      await fs.writeFile(keyPath, encryptionKey);

      console.log(chalk.green(`🔐 تم تشفير الملف: ${path.basename(filePath)}`));

      return encryptedPath;
    } catch (error) {
      console.error(chalk.red('❌ فشل في التشفير:'), error);
      throw error;
    }
  }

  /**
   * فك تشفير الملفات
   */
  async decryptSensitiveFile(encryptedPath: string, key?: string): Promise<string> {
    try {
      const keyPath = `${encryptedPath}.key`;

      if (!(await fs.pathExists(keyPath)) && !key) {
        throw new Error('مفتاح التشفير غير متوفر');
      }

      const encryptionKey = key || (await fs.readFile(keyPath, 'utf8'));
      const encryptedContent = await fs.readFile(encryptedPath, 'utf8');

      // فك التشفير
      const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // حفظ الملف غير المشفر
      const originalPath = encryptedPath.replace('.encrypted', '');
      await fs.writeFile(originalPath, decrypted);

      console.log(chalk.green(`🔓 تم فك تشفير الملف: ${path.basename(originalPath)}`));

      return originalPath;
    } catch (error) {
      console.error(chalk.red('❌ فشل في فك التشفير:'), error);
      throw error;
    }
  }

  /**
   * فحص التبعيات بحثاً عن ثغرات أمنية
   */
  async scanDependencies(): Promise<{
    safe: boolean;
    vulnerabilities: Array<{
      package: string;
      version: string;
      severity: string;
      description: string;
      fix: string;
    }>;
  }> {
    try {
      console.log(chalk.cyan('🔍 فحص التبعيات...'));

      // فحص package.json
      const packagePath = path.join(this.workingDir, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJson(packagePath);

        if (packageJson.dependencies || packageJson.devDependencies) {
          // استخدام npm audit
          try {
            const { stdout } = await execAsync('npm audit --json', { cwd: this.workingDir });
            const auditResult = JSON.parse(stdout);

            const vulnerabilities = [];

            if (auditResult.vulnerabilities) {
              for (const [packageName, vuln] of Object.entries(auditResult.vulnerabilities)) {
                const vulnData = vuln as any;

                vulnerabilities.push({
                  package: packageName,
                  version: vulnData.version,
                  severity: vulnData.severity,
                  description: vulnData.title,
                  fix: vulnData.fixAvailable ? 'npm audit fix' : 'تحديث الحزمة يدوياً',
                });
              }
            }

            const safe =
              vulnerabilities.filter((v) => v.severity === 'critical' || v.severity === 'high')
                .length === 0;

            if (vulnerabilities.length > 0) {
              console.log(chalk.yellow(`⚠️  تم العثور على ${vulnerabilities.length} ثغرة أمنية`));
            } else {
              console.log(chalk.green('✅ لا توجد ثغرات أمنية في التبعيات'));
            }

            return { safe, vulnerabilities };
          } catch (auditError) {
            console.log(chalk.gray('ℹ️  npm audit غير متوفر، تخطي فحص التبعيات'));
          }
        }
      }

      return { safe: true, vulnerabilities: [] };
    } catch (error) {
      console.error(chalk.red('❌ فشل في فحص التبعيات:'), error);
      return { safe: false, vulnerabilities: [] };
    }
  }

  /**
   * إنشاء تقرير أمان شامل
   */
  async generateSecurityReport(): Promise<void> {
    try {
      console.log(chalk.cyan('📊 إنشاء تقرير الأمان...'));

      const reportPath = path.join(this.workingDir, '.oqool', 'security-report.md');
      let report = `# 🔐 تقرير الأمان - ${new Date().toLocaleDateString('ar')}\n\n`;

      // إعدادات الأمان
      report += `## ⚙️ إعدادات الأمان\n\n`;
      report += `- **فحص التوليد:** ${this.config.scanOnGenerate ? '✅ مفعل' : '❌ معطل'}\n`;
      report += `- **فحص التنفيذ:** ${this.config.scanOnExecute ? '✅ مفعل' : '❌ معطل'}\n`;
      report += `- **حظر الضار:** ${this.config.blockMalicious ? '✅ مفعل' : '❌ معطل'}\n`;
      report += `- **أقصى حجم ملف:** ${this.config.maxFileSize}MB\n`;
      report += `- **الامتدادات المسموحة:** ${this.config.allowedExtensions.length}\n\n`;

      // فحص التبعيات
      const depScan = await this.scanDependencies();
      report += `## 📦 التبعيات\n\n`;
      report += `- **الحالة:** ${depScan.safe ? '✅ آمن' : '❌ غير آمن'}\n`;
      report += `- **الثغرات:** ${depScan.vulnerabilities.length}\n\n`;

      if (depScan.vulnerabilities.length > 0) {
        report += `### الثغرات المكتشفة\n\n`;
        for (const vuln of depScan.vulnerabilities.slice(0, 10)) {
          const severity =
            vuln.severity === 'critical'
              ? '🔴'
              : vuln.severity === 'high'
                ? '🟠'
                : vuln.severity === 'moderate'
                  ? '🟡'
                  : '🟢';
          report += `${severity} **${vuln.package}@${vuln.version}**\n`;
          report += `   ${vuln.description}\n`;
          report += `   💡 ${vuln.fix}\n\n`;
        }
      }

      // الأنماط المحظورة
      report += `## 🚫 الأنماط المحظورة\n\n`;
      report += `**العدد:** ${this.config.blockedPatterns.length}\n\n`;
      report += `### الأنماط:\n`;
      for (let i = 0; i < Math.min(this.config.blockedPatterns.length, 10); i++) {
        report += `- \`${this.config.blockedPatterns[i]}\`\n`;
      }
      if (this.config.blockedPatterns.length > 10) {
        report += `- ... و ${this.config.blockedPatterns.length - 10} أخرى\n`;
      }
      report += `\n`;

      // التوصيات
      report += `## 💡 التوصيات\n\n`;

      if (!depScan.safe) {
        report += `- قم بتحديث التبعيات المعرضة للثغرات\n`;
      }

      if (this.config.blockedPatterns.length < 20) {
        report += `- أضف المزيد من الأنماط المحظورة لتحسين الأمان\n`;
      }

      if (!this.config.scanOnExecute) {
        report += `- فعل فحص التنفيذ لمنع تشغيل كود ضار\n`;
      }

      report += `- راجع إعدادات الأمان بانتظام\n`;
      report += `- استخدم توقيع الكود للملفات المهمة\n`;
      report += `- شفر الملفات الحساسة\n\n`;

      report += `---\n\n`;
      report += `*تم إنشاء التقرير بواسطة Oqool Code Security System*\n`;

      await fs.ensureDir(path.dirname(reportPath));
      await fs.writeFile(reportPath, report);

      console.log(chalk.green(`✅ تم حفظ تقرير الأمان: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('❌ فشل في إنشاء تقرير الأمان:'), error);
    }
  }

  /**
   * فحص أوامر النظام
   */
  private containsSystemCommands(code: string): boolean {
    const systemCommands = [
      'exec(',
      'spawn(',
      'execSync(',
      'spawnSync(',
      'child_process',
      'process.exec',
      'eval(',
      "require('child_process')",
      'require("child_process")',
    ];

    return systemCommands.some((cmd) => code.includes(cmd));
  }

  /**
   * فحص المنافذ المفتوحة
   */
  private containsOpenPorts(code: string): boolean {
    const portPatterns = [
      'listen\\(\\d+',
      'createServer\\(\\d+',
      'port\\s*=\\s*\\d+',
      'PORT\\s*=\\s*\\d+',
    ];

    return portPatterns.some((pattern) => new RegExp(pattern).test(code));
  }

  /**
   * فحص الوصول لمتغيرات البيئة
   */
  private containsEnvAccess(code: string): boolean {
    return code.includes('process.env') || code.includes("require('dotenv')");
  }

  /**
   * فحص التشفير غير الآمن
   */
  private containsInsecureCrypto(code: string): boolean {
    const insecurePatterns = [
      "crypto.createHash('md5')",
      "crypto.createHash('sha1')",
      'createCipher\\(',
      'createDecipher\\(',
    ];

    return insecurePatterns.some((pattern) => new RegExp(pattern).test(code));
  }

  /**
   * فحص التحقق من المدخلات
   */
  private hasInputValidation(code: string): boolean {
    const validationPatterns = [
      'validate',
      'sanitize',
      'escape',
      'check',
      'verify',
      'assert',
      'typeof',
      'instanceof',
    ];

    return validationPatterns.some((pattern) => code.includes(pattern));
  }

  /**
   * فحص الملفات القابلة للتنفيذ
   */
  private isExecutableFile(filePath: string): boolean {
    const executableExts = [
      '.js',
      '.ts',
      '.py',
      '.go',
      '.rs',
      '.rb',
      '.php',
      '.sh',
      '.bat',
      '.ps1',
    ];
    return executableExts.includes(path.extname(filePath));
  }

  /**
   * فحص إضافي للملفات القابلة للتنفيذ
   */
  private async scanExecutableFile(content: string, filePath: string): Promise<SecurityScanResult> {
    const issues: SecurityVulnerability[] = [];
    let score = 100;

    // فحص استخدام eval
    if (content.includes('eval(')) {
      issues.push({
        type: 'malicious',
        severity: 'critical',
        file: filePath,
        description: 'استخدام eval() خطير جداً',
        cwe: 'CWE-95',
        fix: 'إزالة eval واستخدام بدائل آمنة',
      });
      score -= 50;
    }

    // فحص الوصول المباشر للملفات
    if (content.includes('fs.') && content.includes('sync')) {
      issues.push({
        type: 'vulnerable',
        severity: 'medium',
        file: filePath,
        description: 'استخدام عمليات ملفات متزامنة',
        fix: 'استخدام عمليات غير متزامنة',
      });
      score -= 15;
    }

    return {
      safe: issues.length === 0,
      issues,
      score: Math.max(0, score),
      recommendations: this.generateRecommendations(issues),
    };
  }

  /**
   * توليد التوصيات
   */
  private generateRecommendations(issues: SecurityVulnerability[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter((i) => i.severity === 'critical');
    const highIssues = issues.filter((i) => i.severity === 'high');
    const mediumIssues = issues.filter((i) => i.severity === 'medium');

    if (criticalIssues.length > 0) {
      recommendations.push(`يوجد ${criticalIssues.length} مشكلة حرجة تحتاج إصلاح فوري`);
    }

    if (highIssues.length > 0) {
      recommendations.push(`يوجد ${highIssues.length} مشكلة عالية الخطورة تحتاج إصلاح سريع`);
    }

    if (mediumIssues.length > 0) {
      recommendations.push(`يوجد ${mediumIssues.length} مشكلة متوسطة تحتاج مراجعة`);
    }

    if (issues.some((i) => i.type === 'malicious')) {
      recommendations.push('تم اكتشاف أنماط ضارة - راجع الكود بعناية');
    }

    if (issues.some((i) => i.type === 'vulnerable')) {
      recommendations.push('تم اكتشاف ثغرات أمنية - طبق الإصلاحات المقترحة');
    }

    if (recommendations.length === 0) {
      recommendations.push('الكود آمن - استمر في الممارسات الجيدة');
    }

    return recommendations;
  }

  /**
   * توليد مفتاح تشفير
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * تحديث التكوين
   */
  async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    const configPath = path.join(this.workingDir, '.oqool', 'security-config.json');
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, this.config, { spaces: 2 });
  }
}

// مصنع لإنشاء instance
export function createSecurityEnhancements(
  apiClient: OqoolAPIClient,
  workingDir?: string
): SecurityEnhancements {
  return new SecurityEnhancements(apiClient, workingDir);
}
