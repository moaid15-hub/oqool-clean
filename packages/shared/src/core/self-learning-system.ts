// self-learning-system.ts
// ============================================
// 🧠 Self-Learning System - نظام التعلم الذاتي
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import type { GodModeResult, Architecture } from './god-mode.js';

// ============================================
// Types
// ============================================

export interface Project {
  id: string;
  task: string;
  architecture: Architecture;
  result: GodModeResult;
  timestamp: number;
}

export interface SuccessAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
}

export interface LearningPattern {
  task: string;
  architecture: Architecture;
  rating: number;
  usageCount: number;
  lastUsed: number;
}

export interface ErrorAnalysis {
  type: string;
  description: string;
  frequency: number;
  solution?: string;
}

export interface Strategy {
  name: string;
  description: string;
  successRate: number;
  applicableTo: string[];
  lastUpdated: number;
}

export interface Lesson {
  task: string;
  pattern: LearningPattern;
  relevanceScore: number;
}

export interface LearningMemory {
  patterns: LearningPattern[];
  errors: ErrorAnalysis[];
  strategies: Strategy[];
  projectHistory: Project[];
  stats: {
    totalProjects: number;
    averageScore: number;
    mostCommonTasks: Record<string, number>;
    improvementRate: number;
  };
}

// ============================================
// Self-Learning System Class
// ============================================

export class SelfLearningSystem {
  private client: Anthropic;
  private memoryPath: string;
  private memory: LearningMemory;

  constructor(apiKey: string, memoryPath?: string) {
    this.client = new Anthropic({ apiKey });

    // Default: global path in user's home directory
    if (!memoryPath) {
      const homeDir = os.homedir();
      const oqoolDir = path.join(homeDir, '.oqool');

      // Create .oqool directory if it doesn't exist
      if (!fs.existsSync(oqoolDir)) {
        fs.mkdirSync(oqoolDir, { recursive: true });
      }

      this.memoryPath = path.join(oqoolDir, 'learning-memory.json');
    } else {
      this.memoryPath = memoryPath;
    }

    this.memory = this.loadMemory();
  }

  // ============================================
  // 1. Learn from Project
  // ============================================
  async learnFromProject(project: Project): Promise<void> {
    console.log('\n🧠 Learning from project...');

    // 1. تحليل النجاح
    const success = await this.analyzeSuccess(project);
    console.log(`   Success Score: ${success.score}/100`);

    // 2. حفظ الأنماط الناجحة
    if (success.score > 90) {
      await this.savePattern({
        task: project.task,
        architecture: project.architecture,
        rating: success.score,
        usageCount: 1,
        lastUsed: Date.now(),
      });
      console.log('   ✅ LearningPattern saved (high success rate)');
    }

    // 3. تحليل الأخطاء
    const errors = await this.analyzeErrors(project);
    await this.learnFromErrors(errors);
    console.log(`   📊 Analyzed ${errors.length} potential issues`);

    // 4. تحديث الاستراتيجيات
    await this.updateStrategies(project, success);
    console.log('   ✅ Strategies updated');

    // 5. حفظ في التاريخ
    this.memory.projectHistory.push(project);
    if (this.memory.projectHistory.length > 100) {
      this.memory.projectHistory.shift(); // Keep last 100
    }

    // 6. تحديث الإحصائيات
    this.updateStats(project, success);

    // 7. حفظ الذاكرة
    await this.saveMemory();

    console.log('   🎓 Learning complete!\n');
  }

  // ============================================
  // 2. Analyze Success
  // ============================================
  private async analyzeSuccess(project: Project): Promise<SuccessAnalysis> {
    const result = project.result;

    const score = Math.round(
      result.analytics.qualityScore * 0.4 +
        result.analytics.securityScore * 0.3 +
        (result.analytics.testsPassed / result.analytics.testsCreated) * 100 * 0.2 +
        (result.success ? 10 : 0)
    );

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // تحليل النقاط القوية
    if (result.analytics.qualityScore >= 90) strengths.push('High code quality');
    if (result.analytics.securityScore >= 90) strengths.push('Excellent security');
    if (result.analytics.testsPassed === result.analytics.testsCreated)
      strengths.push('All tests passing');
    if (result.analytics.filesGenerated >= 10) strengths.push('Comprehensive project structure');

    // تحليل النقاط الضعيفة
    if (result.analytics.qualityScore < 70) weaknesses.push('Code quality needs improvement');
    if (result.analytics.securityScore < 70) weaknesses.push('Security concerns');
    if (result.analytics.testsPassed < result.analytics.testsCreated) {
      weaknesses.push(
        `${result.analytics.testsCreated - result.analytics.testsPassed} tests failing`
      );
    }

    // استخراج الأنماط
    const patterns = this.extractPatterns(project);

    return {
      score,
      strengths,
      weaknesses,
      patterns,
    };
  }

  // ============================================
  // 3. Save LearningPattern
  // ============================================
  private async savePattern(pattern: LearningPattern): Promise<void> {
    // Check if similar pattern exists
    const existing = this.memory.patterns.find(
      (p) => this.calculateSimilarity(p.task, pattern.task) > 0.8
    );

    if (existing) {
      // Update existing pattern
      existing.rating = (existing.rating + pattern.rating) / 2;
      existing.usageCount++;
      existing.lastUsed = Date.now();
    } else {
      // Add new pattern
      this.memory.patterns.push(pattern);
    }

    // Keep top 50 patterns
    this.memory.patterns.sort((a, b) => b.rating - a.rating);
    if (this.memory.patterns.length > 50) {
      this.memory.patterns = this.memory.patterns.slice(0, 50);
    }
  }

  // ============================================
  // 4. Analyze Errors
  // ============================================
  private async analyzeErrors(project: Project): Promise<ErrorAnalysis[]> {
    const errors: ErrorAnalysis[] = [];
    const result = project.result;

    // Security issues
    for (const issue of result.security.issues) {
      errors.push({
        type: 'security',
        description: issue.description,
        frequency: 1,
        solution: `Fix ${issue.type} in ${issue.file}`,
      });
    }

    // Failed tests
    const failedTests = result.analytics.testsCreated - result.analytics.testsPassed;
    if (failedTests > 0) {
      errors.push({
        type: 'test_failure',
        description: `${failedTests} tests failed`,
        frequency: 1,
        solution: 'Review test implementation and fix failing assertions',
      });
    }

    // Low quality score
    if (result.analytics.qualityScore < 70) {
      errors.push({
        type: 'low_quality',
        description: `Quality score below threshold: ${result.analytics.qualityScore}/100`,
        frequency: 1,
        solution: 'Apply code review improvements',
      });
    }

    return errors;
  }

  // ============================================
  // 5. Learn from Errors
  // ============================================
  private async learnFromErrors(errors: ErrorAnalysis[]): Promise<void> {
    for (const error of errors) {
      const existing = this.memory.errors.find(
        (e) => e.type === error.type && e.description === error.description
      );

      if (existing) {
        existing.frequency++;
        if (error.solution) {
          existing.solution = error.solution;
        }
      } else {
        this.memory.errors.push(error);
      }
    }

    // Keep top 30 most frequent errors
    this.memory.errors.sort((a, b) => b.frequency - a.frequency);
    if (this.memory.errors.length > 30) {
      this.memory.errors = this.memory.errors.slice(0, 30);
    }
  }

  // ============================================
  // 6. Update Strategies
  // ============================================
  private async updateStrategies(project: Project, success: SuccessAnalysis): Promise<void> {
    // Determine which strategies were used
    const usedStrategies = this.identifyStrategies(project);

    for (const strategyName of usedStrategies) {
      const strategy = this.memory.strategies.find((s) => s.name === strategyName);

      if (strategy) {
        // Update success rate
        const newRate = (strategy.successRate + success.score) / 2;
        strategy.successRate = newRate;
        strategy.lastUpdated = Date.now();
      } else {
        // Create new strategy
        this.memory.strategies.push({
          name: strategyName,
          description: `Strategy identified from: ${project.task}`,
          successRate: success.score,
          applicableTo: [this.categorizeTask(project.task)],
          lastUpdated: Date.now(),
        });
      }
    }

    // Sort by success rate
    this.memory.strategies.sort((a, b) => b.successRate - a.successRate);
  }

  // ============================================
  // 7. Get Relevant Lessons
  // ============================================
  async getRelevantLessons(task: string): Promise<Lesson[]> {
    const lessons: Lesson[] = [];

    for (const pattern of this.memory.patterns) {
      const relevance = this.calculateSimilarity(task, pattern.task);

      if (relevance > 0.5) {
        lessons.push({
          task: pattern.task,
          pattern,
          relevanceScore: relevance,
        });
      }
    }

    // Sort by relevance
    lessons.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return lessons.slice(0, 5); // Top 5 lessons
  }

  // ============================================
  // 8. Get Recommendations
  // ============================================
  async getRecommendations(task: string): Promise<string[]> {
    const recommendations: string[] = [];

    // Get relevant lessons
    const lessons = await this.getRelevantLessons(task);

    if (lessons.length > 0) {
      recommendations.push(`📚 Found ${lessons.length} similar successful projects`);

      for (const lesson of lessons) {
        recommendations.push(
          `   • "${lesson.task}" (${Math.round(lesson.relevanceScore * 100)}% similar, score: ${lesson.pattern.rating}/100)`
        );
      }
    }

    // Get common errors to avoid
    const category = this.categorizeTask(task);
    const relevantErrors = this.memory.errors.filter(
      (e) => e.type.includes(category) || e.frequency > 5
    );

    if (relevantErrors.length > 0) {
      recommendations.push('\n⚠️  Common issues to avoid:');

      for (const error of relevantErrors.slice(0, 3)) {
        recommendations.push(`   • ${error.description}`);
        if (error.solution) {
          recommendations.push(`     → ${error.solution}`);
        }
      }
    }

    // Get best strategies
    const bestStrategies = this.memory.strategies
      .filter((s) => s.applicableTo.includes(category))
      .slice(0, 3);

    if (bestStrategies.length > 0) {
      recommendations.push('\n💡 Recommended strategies:');

      for (const strategy of bestStrategies) {
        recommendations.push(
          `   • ${strategy.name} (success rate: ${Math.round(strategy.successRate)}%)`
        );
      }
    }

    return recommendations;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractPatterns(project: Project): string[] {
    const patterns: string[] = [];
    const arch = project.architecture;

    if (arch.database) patterns.push(`database:${arch.database.type}`);
    if (arch.frontend) patterns.push(`frontend:${arch.frontend.framework}`);
    if (arch.api) patterns.push(`api:${arch.api.authentication}`);

    patterns.push(`components:${arch.components.length}`);

    return patterns;
  }

  private identifyStrategies(project: Project): string[] {
    const strategies: string[] = [];
    const arch = project.architecture;

    if (arch.database) strategies.push('database-integration');
    if (arch.frontend && arch.api) strategies.push('full-stack');
    if (arch.api?.authentication) strategies.push('authentication');
    if (arch.components.length > 5) strategies.push('modular-architecture');

    return strategies;
  }

  private categorizeTask(task: string): string {
    const lower = task.toLowerCase();

    if (lower.includes('saas') || lower.includes('platform')) return 'saas';
    if (lower.includes('api') || lower.includes('backend')) return 'api';
    if (lower.includes('dashboard') || lower.includes('admin')) return 'dashboard';
    if (lower.includes('app') || lower.includes('application')) return 'application';
    if (lower.includes('website') || lower.includes('web')) return 'website';

    return 'general';
  }

  private calculateSimilarity(task1: string, task2: string): number {
    const words1 = task1.toLowerCase().split(/\s+/);
    const words2 = task2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((w) => words2.includes(w));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }

  private updateStats(project: Project, success: SuccessAnalysis): void {
    const stats = this.memory.stats;

    stats.totalProjects++;
    stats.averageScore =
      (stats.averageScore * (stats.totalProjects - 1) + success.score) / stats.totalProjects;

    const category = this.categorizeTask(project.task);
    stats.mostCommonTasks[category] = (stats.mostCommonTasks[category] || 0) + 1;

    // Calculate improvement rate
    if (this.memory.projectHistory.length >= 10) {
      const recent = this.memory.projectHistory.slice(-10);
      const older = this.memory.projectHistory.slice(-20, -10);

      if (older.length > 0) {
        const recentAvg =
          recent.reduce((sum, p) => sum + (p.result.analytics.qualityScore || 0), 0) /
          recent.length;
        const olderAvg =
          older.reduce((sum, p) => sum + (p.result.analytics.qualityScore || 0), 0) / older.length;

        stats.improvementRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      }
    }
  }

  // ============================================
  // Memory Management
  // ============================================

  private loadMemory(): LearningMemory {
    try {
      if (fs.existsSync(this.memoryPath)) {
        return JSON.parse(fs.readFileSync(this.memoryPath, 'utf-8'));
      }
    } catch (error) {
      console.warn('Failed to load memory, starting fresh');
    }

    return {
      patterns: [],
      errors: [],
      strategies: [],
      projectHistory: [],
      stats: {
        totalProjects: 0,
        averageScore: 0,
        mostCommonTasks: {},
        improvementRate: 0,
      },
    };
  }

  private async saveMemory(): Promise<void> {
    await fs.writeFile(this.memoryPath, JSON.stringify(this.memory, null, 2));
  }

  // ============================================
  // Stats Display
  // ============================================

  async showStats(): Promise<void> {
    const stats = this.memory.stats;

    console.log('\n📊 Self-Learning System Statistics\n');
    console.log('═'.repeat(50));
    console.log(`📁 Memory Location: ${this.memoryPath}`);
    console.log(`Total Projects: ${stats.totalProjects}`);
    console.log(`Average Score: ${Math.round(stats.averageScore)}/100`);
    console.log(
      `Improvement Rate: ${stats.improvementRate > 0 ? '+' : ''}${Math.round(stats.improvementRate)}%`
    );

    console.log('\n📈 Most Common Tasks:');
    const sorted = Object.entries(stats.mostCommonTasks).sort(([, a], [, b]) => b - a);

    for (const [category, count] of sorted) {
      console.log(`   ${category}: ${count} projects`);
    }

    console.log(`\n🧠 Knowledge Base:`);
    console.log(`   Patterns: ${this.memory.patterns.length}`);
    console.log(`   Known Errors: ${this.memory.errors.length}`);
    console.log(`   Strategies: ${this.memory.strategies.length}`);
    console.log('═'.repeat(50) + '\n');
  }
}

// ============================================
// Factory
// ============================================

export function createSelfLearningSystem(apiKey: string, memoryPath?: string): SelfLearningSystem {
  return new SelfLearningSystem(apiKey, memoryPath);
}
