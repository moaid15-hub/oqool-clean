// code-metrics.ts
// ============================================
// 📏 Code Metrics System
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { glob } from 'glob';
import { OqoolAPIClient } from './api-client.js';
import { FileManager, createFileManager } from './file-manager.js';

export interface CodeMetrics {
  timestamp: string;
  file: string;
  language: string;
  linesOfCode: number;
  linesOfComments: number;
  linesOfBlank: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  depthOfInheritance: number;
  classCoupling: number;
  functionPoints: number;
  codeCoverage: number;
  duplications: CodeDuplication[];
  smells: CodeSmell[];
  issues: CodeIssue[];
  score: CodeScore;
}

export interface CodeDuplication {
  lines: number;
  files: string[];
  content: string;
  similarity: number;
}

export interface CodeSmell {
  type:
    | 'long_method'
    | 'large_class'
    | 'long_parameter_list'
    | 'duplicate_code'
    | 'complex_condition'
    | 'dead_code'
    | 'feature_envy';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  suggestion: string;
}

export interface CodeIssue {
  type: 'bug' | 'vulnerability' | 'code_smell' | 'duplication' | 'coverage';
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
  title: string;
  description: string;
  line?: number;
  file: string;
  effort: string;
  debt: string;
}

export interface CodeScore {
  overall: number; // 0-100
  maintainability: number;
  reliability: number;
  security: number;
  performance: number;
  coverage: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface ProjectMetrics {
  timestamp: string;
  files: CodeMetrics[];
  summary: ProjectSummary;
  trends: MetricTrends;
  recommendations: string[];
  benchmarks: BenchmarkComparison;
}

export interface ProjectSummary {
  totalFiles: number;
  totalLinesOfCode: number;
  totalLinesOfComments: number;
  totalLinesOfBlank: number;
  averageComplexity: number;
  averageMaintainability: number;
  totalDuplications: number;
  totalSmells: number;
  totalIssues: number;
  codeCoverage: number;
  technicalDebt: string;
  estimatedEffort: string;
  overallScore: number;
}

export interface MetricTrends {
  complexity: TrendData[];
  maintainability: TrendData[];
  coverage: TrendData[];
  duplications: TrendData[];
  issues: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
  change: number;
}

export interface BenchmarkComparison {
  industry: {
    complexity: number;
    maintainability: number;
    coverage: number;
    debt: string;
  };
  similarProjects: {
    complexity: number;
    maintainability: number;
    coverage: number;
    debt: string;
  };
  status: 'above_average' | 'average' | 'below_average';
}

export interface QualityGate {
  name: string;
  conditions: QualityCondition[];
  status: 'passed' | 'failed';
}

export interface QualityCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  status: 'passed' | 'failed';
}

export class CodeMetricsAnalyzer {
  private apiClient: OqoolAPIClient;
  private workingDir: string;
  private metricsPath: string;
  private reportsPath: string;
  private historyPath: string;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.workingDir = workingDir;
    this.metricsPath = path.join(workingDir, '.oqool', 'code-metrics');
    this.reportsPath = path.join(workingDir, '.oqool', 'metrics-reports');
    this.historyPath = path.join(workingDir, '.oqool', 'metrics-history');
    this.initializeSystem();
  }

  private async initializeSystem(): Promise<void> {
    await fs.ensureDir(this.metricsPath);
    await fs.ensureDir(this.reportsPath);
    await fs.ensureDir(this.historyPath);
  }

  // تحليل ملف واحد
  async analyzeFile(filePath: string): Promise<CodeMetrics> {
    const spinner = ora(`تحليل ${filePath}...`).start();

    try {
      const fileManager = createFileManager();
      const content = await fileManager.readFile(filePath);

      if (!content) {
        throw new Error('الملف غير موجود أو فارغ');
      }

      const language = this.detectLanguage(filePath);
      const metrics = await this.calculateFileMetrics(filePath, content, language);

      spinner.succeed(`تم تحليل ${filePath}`);

      return metrics;
    } catch (error: any) {
      spinner.fail(`فشل تحليل ${filePath}`);
      throw error;
    }
  }

  // تحليل مشروع كامل
  async analyzeProject(
    pattern: string = '**/*.{js,ts,jsx,tsx,py,java,go,rs,php,rb}'
  ): Promise<ProjectMetrics> {
    console.log(chalk.cyan('\n📏 تحليل مقاييس الكود...\n'));

    const spinner = ora('جمع ملفات المشروع...').start();

    try {
      const files = await glob(pattern, { ignore: 'node_modules/**' });

      spinner.text = `تحليل ${files.length} ملف...`;

      const allMetrics: CodeMetrics[] = [];

      // تحليل كل ملف
      for (const filePath of files) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const metrics = await this.calculateFileMetrics(
            filePath,
            content,
            this.detectLanguage(filePath)
          );
          allMetrics.push(metrics);
        } catch (error) {
          // تجاهل الأخطاء في الملفات الفردية
        }
      }

      // حساب ملخص المشروع
      const summary = this.calculateProjectSummary(allMetrics);

      // تحليل الاتجاهات
      const trends = await this.analyzeTrends(allMetrics);

      // المقارنة مع المعايير
      const benchmarks = await this.compareWithBenchmarks(summary);

      // التوصيات
      const recommendations = this.generateRecommendations(allMetrics, summary);

      const projectMetrics: ProjectMetrics = {
        timestamp: new Date().toISOString(),
        files: allMetrics,
        summary,
        trends,
        recommendations,
        benchmarks,
      };

      spinner.succeed(`تم تحليل ${allMetrics.length} ملف`);

      await this.saveProjectMetrics(projectMetrics);

      this.displayProjectSummary(summary);
      this.displayTopIssues(allMetrics);

      return projectMetrics;
    } catch (error: any) {
      spinner.fail('فشل تحليل المشروع');
      throw error;
    }
  }

  // حساب مقاييس الملف
  private async calculateFileMetrics(
    filePath: string,
    content: string,
    language: string
  ): Promise<CodeMetrics> {
    const lines = content.split('\n');
    const timestamp = new Date().toISOString();

    // حساب الأسطر
    const linesOfCode = lines.filter(
      (line) =>
        line.trim().length > 0 &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('/*')
    ).length;
    const linesOfComments = lines.filter(
      (line) =>
        line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('/*')
    ).length;
    const linesOfBlank = lines.filter((line) => line.trim().length === 0).length;

    // حساب التعقيد الدوري (محاكاة بسيطة)
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(content, language);

    // مؤشر الصيانة (محاكاة)
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      linesOfCode,
      cyclomaticComplexity,
      linesOfComments
    );

    // العمق الوراثي (محاكاة)
    const depthOfInheritance = this.calculateDepthOfInheritance(content, language);

    // اقتران الأصناف (محاكاة)
    const classCoupling = this.calculateClassCoupling(content, language);

    // نقاط الوظائف (محاكاة)
    const functionPoints = this.calculateFunctionPoints(content, language);

    // تغطية الكود (محاكاة)
    const codeCoverage = Math.random() * 100;

    // الكشف عن التكرارات
    const duplications = await this.findDuplications(content, [filePath]);

    // الكشف عن الروائح
    const smells = this.detectCodeSmells(content, language, filePath);

    // الكشف عن المشاكل
    const issues = this.detectIssues(content, language, filePath);

    // حساب الدرجة الإجمالية
    const score = this.calculateCodeScore({
      maintainability: maintainabilityIndex,
      complexity: cyclomaticComplexity,
      coverage: codeCoverage,
      issues: issues.length,
      smells: smells.length,
      duplications: duplications.length,
    });

    return {
      timestamp,
      file: filePath,
      language,
      linesOfCode,
      linesOfComments,
      linesOfBlank,
      cyclomaticComplexity,
      maintainabilityIndex,
      depthOfInheritance,
      classCoupling,
      functionPoints,
      codeCoverage,
      duplications,
      smells,
      issues,
      score,
    };
  }

  // حساب التعقيد الدوري
  private calculateCyclomaticComplexity(content: string, language: string): number {
    let complexity = 1; // base complexity

    // JavaScript/TypeScript
    if (['javascript', 'typescript'].includes(language)) {
      const patterns = [
        /if\s*\(/g,
        /else\s+if\s*\(/g,
        /for\s*\(/g,
        /forEach\s*\(/g,
        /while\s*\(/g,
        /do\s*{/g,
        /switch\s*\(/g,
        /case\s+/g,
        /catch\s*\(/g,
        /&&/g,
        /\|\|/g,
        /\?/g,
      ];

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      }
    }

    // Python
    else if (language === 'python') {
      const patterns = [
        /if\s+/g,
        /elif\s+/g,
        /for\s+/g,
        /while\s+/g,
        /except\s+/g,
        /and\s+/g,
        /or\s+/g,
      ];

      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          complexity += matches.length;
        }
      }
    }

    return complexity;
  }

  // حساب مؤشر الصيانة
  private calculateMaintainabilityIndex(loc: number, complexity: number, comments: number): number {
    if (loc === 0) return 100;

    const volume = loc * Math.log2(loc + complexity);
    const maintainability = Math.max(
      0,
      ((171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(loc)) * 100) / 171
    );

    return Math.round(maintainability);
  }

  // حساب عمق الوراثة
  private calculateDepthOfInheritance(content: string, language: string): number {
    // محاكاة بسيطة
    if (['javascript', 'typescript'].includes(language)) {
      const extendsMatches = content.match(/extends\s+\w+/g);
      const implementsMatches = content.match(/implements\s+\w+/g);

      return (extendsMatches?.length || 0) + (implementsMatches?.length || 0);
    }

    return 0;
  }

  // حساب اقتران الأصناف
  private calculateClassCoupling(content: string, language: string): number {
    // محاكاة بسيطة
    if (['javascript', 'typescript'].includes(language)) {
      const importMatches = content.match(/import.*from/g);
      const requireMatches = content.match(/require\s*\(/g);

      return (importMatches?.length || 0) + (requireMatches?.length || 0);
    }

    return 0;
  }

  // حساب نقاط الوظائف
  private calculateFunctionPoints(content: string, language: string): number {
    let points = 0;

    if (['javascript', 'typescript'].includes(language)) {
      const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g);
      points = (functionMatches?.length || 0) * 3;
    } else if (language === 'python') {
      const functionMatches = content.match(/def\s+\w+/g);
      points = (functionMatches?.length || 0) * 3;
    }

    return points;
  }

  // حساب درجة الكود
  private calculateCodeScore(factors: {
    maintainability: number;
    complexity: number;
    coverage: number;
    issues: number;
    smells: number;
    duplications: number;
  }): CodeScore {
    // تطبيع المقاييس (0-100)
    const maintainability = factors.maintainability;
    const complexity = Math.max(0, 100 - factors.complexity * 2);
    const coverage = factors.coverage;
    const issues = Math.max(0, 100 - factors.issues * 10);
    const smells = Math.max(0, 100 - factors.smells * 5);
    const duplications = Math.max(0, 100 - factors.duplications * 20);

    // حساب الدرجة الإجمالية
    const overall =
      maintainability * 0.3 +
      complexity * 0.2 +
      coverage * 0.2 +
      issues * 0.15 +
      smells * 0.1 +
      duplications * 0.05;

    // تحديد الدرجة
    let grade: CodeScore['grade'];
    if (overall >= 95) grade = 'A+';
    else if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    return {
      overall: Math.round(overall),
      maintainability,
      reliability: issues,
      security: smells,
      performance: complexity,
      coverage,
      grade,
    };
  }

  // كشف روائح الكود
  private detectCodeSmells(content: string, language: string, filePath: string): CodeSmell[] {
    const smells: CodeSmell[] = [];
    const lines = content.split('\n');

    // دالة طويلة
    if (lines.length > 50) {
      smells.push({
        type: 'long_method',
        description: 'الدالة طويلة جداً',
        severity: lines.length > 100 ? 'high' : 'medium',
        line: 1,
        suggestion: 'قسم الدالة إلى دوال أصغر',
      });
    }

    // قائمة معاملات طويلة
    const longParams = content.match(/function\s+\w+\s*\(([^)]{100,})/);
    if (longParams) {
      smells.push({
        type: 'long_parameter_list',
        description: 'قائمة المعاملات طويلة',
        severity: 'medium',
        line: content.indexOf(longParams[1]) + 1,
        suggestion: 'استخدم object للمعاملات أو قسم الدالة',
      });
    }

    // شروط معقدة
    const complexConditions = content.match(/if\s*\([^)]{50,}/g);
    if (complexConditions) {
      smells.push({
        type: 'complex_condition',
        description: 'شرط معقد جداً',
        severity: 'medium',
        line: content.indexOf(complexConditions[0]) + 1,
        suggestion: 'قسم الشرط إلى متغيرات منفصلة',
      });
    }

    // كود غير مستخدم
    const unusedVars = this.detectUnusedVariables(content, language);
    for (const unused of unusedVars) {
      smells.push({
        type: 'dead_code',
        description: `متغير غير مستخدم: ${unused.name}`,
        severity: 'low',
        line: unused.line,
        suggestion: 'احذف المتغير غير المستخدم',
      });
    }

    return smells;
  }

  // كشف المتغيرات غير المستخدمة
  private detectUnusedVariables(
    content: string,
    language: string
  ): Array<{ name: string; line: number }> {
    // محاكاة بسيطة
    const unused: Array<{ name: string; line: number }> = [];

    if (['javascript', 'typescript'].includes(language)) {
      const varMatches = content.match(/const\s+(\w+)\s*=/g);
      if (varMatches) {
        for (const match of varMatches) {
          const varName = match.match(/const\s+(\w+)/)?.[1];
          if (varName && !content.includes(varName)) {
            const line = content.split('\n').findIndex((l) => l.includes(match)) + 1;
            unused.push({ name: varName, line });
          }
        }
      }
    }

    return unused;
  }

  // كشف المشاكل في الكود
  private detectIssues(content: string, language: string, filePath: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // مشاكل أمان
    const securityIssues = this.detectSecurityIssues(content, language);
    issues.push(...securityIssues);

    // مشاكل أداء
    const performanceIssues = this.detectPerformanceIssues(content, language);
    issues.push(...performanceIssues);

    // مشاكل صيانة
    const maintainabilityIssues = this.detectMaintainabilityIssues(content, language);
    issues.push(...maintainabilityIssues);

    return issues;
  }

  // كشف مشاكل الأمان
  private detectSecurityIssues(content: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    if (['javascript', 'typescript'].includes(language)) {
      // استخدام eval
      if (content.includes('eval(')) {
        issues.push({
          type: 'vulnerability',
          severity: 'critical',
          title: 'استخدام eval غير آمن',
          description: 'استخدام eval قد يؤدي إلى تنفيذ كود ضار',
          file: 'current',
          effort: '30min',
          debt: '1h',
        });
      }

      // استخدام innerHTML
      if (content.includes('.innerHTML')) {
        issues.push({
          type: 'vulnerability',
          severity: 'major',
          title: 'XSS vulnerability',
          description: 'استخدام innerHTML قد يؤدي إلى XSS attacks',
          file: 'current',
          effort: '15min',
          debt: '30min',
        });
      }
    }

    return issues;
  }

  // كشف مشاكل الأداء
  private detectPerformanceIssues(content: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    if (['javascript', 'typescript'].includes(language)) {
      // loops داخل loops
      const nestedLoops =
        (content.match(/for\s*\(/g) || []).length + (content.match(/while\s*\(/g) || []).length;
      if (nestedLoops > 2) {
        issues.push({
          type: 'code_smell',
          severity: 'major',
          title: 'Nested loops',
          description: 'حلقات متداخلة قد تؤثر على الأداء',
          file: 'current',
          effort: '1h',
          debt: '2h',
        });
      }
    }

    return issues;
  }

  // كشف مشاكل الصيانة
  private detectMaintainabilityIssues(content: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    // دوال بدون تعليق
    if (['javascript', 'typescript'].includes(language)) {
      const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g);
      if (functions && functions.length > 0) {
        const comments = lines.filter(
          (line) => line.trim().startsWith('//') || line.trim().startsWith('/*')
        ).length;

        if (comments / lines.length < 0.1) {
          issues.push({
            type: 'code_smell',
            severity: 'minor',
            title: 'نقص في التعليقات',
            description: 'الكود يحتاج إلى المزيد من التعليقات',
            file: 'current',
            effort: '30min',
            debt: '1h',
          });
        }
      }
    }

    return issues;
  }

  // البحث عن التكرارات
  private async findDuplications(content: string, files: string[]): Promise<CodeDuplication[]> {
    // محاكاة بسيطة للبحث عن التكرارات
    const duplications: CodeDuplication[] = [];

    // البحث عن أسطر متكررة
    const lines = content.split('\n');
    const duplicates = new Map<string, string[]>();

    for (let i = 0; i < lines.length - 2; i++) {
      const block = lines.slice(i, i + 3).join('\n');
      if (block.trim().length > 20) {
        if (!duplicates.has(block)) {
          duplicates.set(block, [files[0]]);
        } else {
          duplicates.get(block)!.push(files[0]);
        }
      }
    }

    for (const [content, fileList] of duplicates.entries()) {
      if (fileList.length > 1) {
        duplications.push({
          lines: content.split('\n').length,
          files: fileList,
          content: content.substring(0, 100) + '...',
          similarity: 100,
        });
      }
    }

    return duplications;
  }

  // تحديد لغة الملف
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      sql: 'sql',
      yaml: 'yaml',
      yml: 'yaml',
    };

    return languageMap[ext] || 'text';
  }

  // حساب ملخص المشروع
  private calculateProjectSummary(metrics: CodeMetrics[]): ProjectSummary {
    if (metrics.length === 0) {
      return {
        totalFiles: 0,
        totalLinesOfCode: 0,
        totalLinesOfComments: 0,
        totalLinesOfBlank: 0,
        averageComplexity: 0,
        averageMaintainability: 0,
        totalDuplications: 0,
        totalSmells: 0,
        totalIssues: 0,
        codeCoverage: 0,
        technicalDebt: '0h',
        estimatedEffort: '0h',
        overallScore: 0,
      };
    }

    const totalLinesOfCode = metrics.reduce((sum, m) => sum + m.linesOfCode, 0);
    const totalLinesOfComments = metrics.reduce((sum, m) => sum + m.linesOfComments, 0);
    const totalLinesOfBlank = metrics.reduce((sum, m) => sum + m.linesOfBlank, 0);
    const averageComplexity =
      metrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / metrics.length;
    const averageMaintainability =
      metrics.reduce((sum, m) => sum + m.maintainabilityIndex, 0) / metrics.length;
    const totalDuplications = metrics.reduce((sum, m) => sum + m.duplications.length, 0);
    const totalSmells = metrics.reduce((sum, m) => sum + m.smells.length, 0);
    const totalIssues = metrics.reduce((sum, m) => sum + m.issues.length, 0);
    const codeCoverage = metrics.reduce((sum, m) => sum + m.codeCoverage, 0) / metrics.length;

    // حساب الدين التقني
    const technicalDebt = this.calculateTechnicalDebt(totalIssues, totalSmells, totalDuplications);

    // حساب الجهد المطلوب
    const estimatedEffort = this.calculateEstimatedEffort(totalIssues, totalSmells);

    // حساب الدرجة الإجمالية
    const overallScore = metrics.reduce((sum, m) => sum + m.score.overall, 0) / metrics.length;

    return {
      totalFiles: metrics.length,
      totalLinesOfCode,
      totalLinesOfComments,
      totalLinesOfBlank,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      averageMaintainability: Math.round(averageMaintainability * 100) / 100,
      totalDuplications,
      totalSmells,
      totalIssues,
      codeCoverage: Math.round(codeCoverage * 100) / 100,
      technicalDebt,
      estimatedEffort,
      overallScore: Math.round(overallScore),
    };
  }

  // حساب الدين التقني
  private calculateTechnicalDebt(
    totalIssues: number,
    totalSmells: number,
    totalDuplications: number
  ): string {
    const debtHours = totalIssues * 2 + totalSmells * 1 + totalDuplications * 3;

    if (debtHours < 8) return `${debtHours}h`;
    if (debtHours < 40) return `${Math.ceil(debtHours / 8)}d`;
    return `${Math.ceil(debtHours / 40)}w`;
  }

  // حساب الجهد المطلوب
  private calculateEstimatedEffort(totalIssues: number, totalSmells: number): string {
    const effortHours = totalIssues * 1.5 + totalSmells * 0.5;

    if (effortHours < 8) return `${effortHours}h`;
    if (effortHours < 40) return `${Math.ceil(effortHours / 8)}d`;
    return `${Math.ceil(effortHours / 40)}w`;
  }

  // تحليل الاتجاهات
  private async analyzeTrends(metrics: CodeMetrics[]): Promise<MetricTrends> {
    // تحميل التاريخ السابق
    const history = await this.loadMetricsHistory();

    const trends: MetricTrends = {
      complexity: [],
      maintainability: [],
      coverage: [],
      duplications: [],
      issues: [],
    };

    // إضافة البيانات الحالية
    const today = new Date().toISOString().split('T')[0];

    const currentComplexity =
      metrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) / metrics.length;
    const currentMaintainability =
      metrics.reduce((sum, m) => sum + m.maintainabilityIndex, 0) / metrics.length;
    const currentCoverage = metrics.reduce((sum, m) => sum + m.codeCoverage, 0) / metrics.length;
    const currentDuplications = metrics.reduce((sum, m) => sum + m.duplications.length, 0);
    const currentIssues = metrics.reduce((sum, m) => sum + m.issues.length, 0);

    trends.complexity.push({
      date: today,
      value: Math.round(currentComplexity * 100) / 100,
      change: 0,
    });

    trends.maintainability.push({
      date: today,
      value: Math.round(currentMaintainability * 100) / 100,
      change: 0,
    });

    trends.coverage.push({
      date: today,
      value: Math.round(currentCoverage * 100) / 100,
      change: 0,
    });

    trends.duplications.push({
      date: today,
      value: currentDuplications,
      change: 0,
    });

    trends.issues.push({
      date: today,
      value: currentIssues,
      change: 0,
    });

    return trends;
  }

  // المقارنة مع المعايير
  private async compareWithBenchmarks(summary: ProjectSummary): Promise<BenchmarkComparison> {
    // معايير الصناعة (محاكاة)
    const industry = {
      complexity: 5,
      maintainability: 75,
      coverage: 80,
      debt: '2d',
    };

    // معايير المشاريع المشابهة (محاكاة)
    const similarProjects = {
      complexity: 7,
      maintainability: 70,
      coverage: 75,
      debt: '3d',
    };

    // تحديد الحالة
    let status: BenchmarkComparison['status'] = 'average';

    if (
      summary.averageComplexity < industry.complexity &&
      summary.averageMaintainability > industry.maintainability &&
      summary.codeCoverage > industry.coverage
    ) {
      status = 'above_average';
    } else if (
      summary.averageComplexity > industry.complexity * 1.5 ||
      summary.averageMaintainability < industry.maintainability * 0.8 ||
      summary.codeCoverage < industry.coverage * 0.8
    ) {
      status = 'below_average';
    }

    return {
      industry,
      similarProjects,
      status,
    };
  }

  // توليد التوصيات
  private generateRecommendations(metrics: CodeMetrics[], summary: ProjectSummary): string[] {
    const recommendations: string[] = [];

    // توصيات بناءً على الدرجة الإجمالية
    if (summary.overallScore < 60) {
      recommendations.push('المشروع يحتاج إلى إعادة هيكلة شاملة');
    } else if (summary.overallScore < 70) {
      recommendations.push('ركز على تحسين الصيانة والاختبارات');
    } else if (summary.overallScore < 80) {
      recommendations.push('المشروع جيد لكن يمكن تحسينه');
    }

    // توصيات بناءً على التعقيد
    if (summary.averageComplexity > 10) {
      recommendations.push('التعقيد مرتفع - قسم الدوال المعقدة');
    }

    // توصيات بناءً على التغطية
    if (summary.codeCoverage < 70) {
      recommendations.push('أضف المزيد من الاختبارات لتحسين التغطية');
    }

    // توصيات بناءً على التكرارات
    if (summary.totalDuplications > 0) {
      recommendations.push('أزل التكرارات في الكود');
    }

    // توصيات بناءً على الروائح
    if (summary.totalSmells > metrics.length * 2) {
      recommendations.push('راجع وأصلح روائح الكود');
    }

    // توصية افتراضية إذا كان كل شيء جيد
    if (recommendations.length === 0) {
      recommendations.push('المشروع في حالة ممتازة! استمر في الممارسات الجيدة');
    }

    return recommendations;
  }

  // عرض ملخص المشروع
  private displayProjectSummary(summary: ProjectSummary): void {
    console.log(chalk.cyan('\n📊 ملخص مقاييس المشروع:\n'));

    console.log(chalk.yellow('📈 الإحصائيات:'));
    console.log(chalk.white(`   الملفات: ${chalk.cyan(summary.totalFiles)}`));
    console.log(
      chalk.white(`   أسطر الكود: ${chalk.cyan(summary.totalLinesOfCode.toLocaleString('ar'))}`)
    );
    console.log(
      chalk.white(
        `   أسطر التعليقات: ${chalk.cyan(summary.totalLinesOfComments.toLocaleString('ar'))}`
      )
    );
    console.log(
      chalk.white(`   أسطر فارغة: ${chalk.cyan(summary.totalLinesOfBlank.toLocaleString('ar'))}`)
    );

    console.log(chalk.yellow('🎯 جودة الكود:'));
    console.log(chalk.white(`   متوسط التعقيد: ${chalk.cyan(summary.averageComplexity)}`));
    console.log(
      chalk.white(`   مؤشر الصيانة: ${chalk.cyan(summary.averageMaintainability + '%')}`)
    );
    console.log(chalk.white(`   تغطية الاختبارات: ${chalk.cyan(summary.codeCoverage + '%')}`));

    console.log(chalk.yellow('⚠️  المشاكل:'));
    console.log(chalk.white(`   التكرارات: ${chalk.cyan(summary.totalDuplications)}`));
    console.log(chalk.white(`   روائح الكود: ${chalk.cyan(summary.totalSmells)}`));
    console.log(chalk.white(`   المشاكل: ${chalk.cyan(summary.totalIssues)}`));

    console.log(chalk.yellow('💰 الدين التقني:'));
    console.log(chalk.white(`   الدين التقني: ${chalk.cyan(summary.technicalDebt)}`));
    console.log(chalk.white(`   الجهد المطلوب: ${chalk.cyan(summary.estimatedEffort)}`));

    // عرض الدرجة الإجمالية
    const gradeColor = this.getGradeColor(summary.overallScore);
    console.log(
      chalk.white(
        `   الدرجة الإجمالية: ${gradeColor(summary.overallScore + '/100')} (${this.getGradeLetter(summary.overallScore)})`
      )
    );

    console.log();
  }

  // عرض أهم المشاكل
  private displayTopIssues(metrics: CodeMetrics[]): void {
    console.log(chalk.yellow('🔥 أهم المشاكل (أعلى 10):'));

    const allIssues: Array<{ file: string; issue: CodeIssue; severity: number }> = [];

    for (const metric of metrics) {
      for (const issue of metric.issues) {
        const severityScore = this.getSeverityScore(issue.severity);
        allIssues.push({ file: metric.file, issue, severity: severityScore });
      }
    }

    // ترتيب حسب الخطورة
    allIssues.sort((a, b) => b.severity - a.severity);

    for (let i = 0; i < Math.min(10, allIssues.length); i++) {
      const item = allIssues[i];
      const severityIcon = this.getSeverityIcon(item.issue.severity);
      const typeColor = this.getIssueTypeColor(item.issue.type);

      console.log(
        chalk.gray(`   ${i + 1}. ${severityIcon} ${typeColor(item.issue.type)} ${item.issue.title}`)
      );
      console.log(chalk.gray(`      📁 ${item.file} - ${item.issue.description}`));
      console.log(chalk.gray(`      ⏱️  ${item.issue.effort} - 💰 ${item.issue.debt}\n`));
    }

    if (allIssues.length === 0) {
      console.log(chalk.green('   ✨ لا توجد مشاكل كبيرة!\n'));
    }
  }

  // الحصول على لون الدرجة
  private getGradeColor(score: number): Function {
    if (score >= 90) return chalk.green;
    if (score >= 80) return chalk.blue;
    if (score >= 70) return chalk.yellow;
    if (score >= 60) return chalk.magenta;
    return chalk.red;
  }

  // الحصول على حرف الدرجة
  private getGradeLetter(score: number): string {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // الحصول على أيقونة الخطورة
  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'major':
        return '🟠';
      case 'minor':
        return '🟡';
      case 'info':
        return '🔵';
      default:
        return '⚪';
    }
  }

  // الحصول على لون نوع المشكلة
  private getIssueTypeColor(type: string): Function {
    switch (type) {
      case 'bug':
        return chalk.red;
      case 'vulnerability':
        return chalk.magenta;
      case 'code_smell':
        return chalk.yellow;
      case 'duplication':
        return chalk.blue;
      case 'coverage':
        return chalk.cyan;
      default:
        return chalk.white;
    }
  }

  // الحصول على درجة الخطورة
  private getSeverityScore(severity: string): number {
    switch (severity) {
      case 'critical':
        return 5;
      case 'blocker':
        return 5;
      case 'major':
        return 4;
      case 'minor':
        return 2;
      case 'info':
        return 1;
      default:
        return 3;
    }
  }

  // تحميل تاريخ المقاييس
  private async loadMetricsHistory(): Promise<ProjectMetrics[]> {
    try {
      const files = await fs.readdir(this.historyPath);
      const history: ProjectMetrics[] = [];

      for (const file of files.filter((f) => f.endsWith('.json')).slice(-7)) {
        // آخر 7 أيام
        const metrics = await fs.readJson(path.join(this.historyPath, file));
        history.push(metrics);
      }

      return history;
    } catch {
      return [];
    }
  }

  // حفظ مقاييس المشروع
  private async saveProjectMetrics(metrics: ProjectMetrics): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.historyPath, `${date}.json`);
    await fs.writeJson(filePath, metrics, { spaces: 2 });
  }
}

export function createCodeMetricsAnalyzer(
  apiClient: OqoolAPIClient,
  workingDir?: string
): CodeMetricsAnalyzer {
  return new CodeMetricsAnalyzer(apiClient, workingDir);
}
