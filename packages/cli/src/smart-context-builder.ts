/**
 * Smart Context Builder
 *
 * نظام متقدم لبناء السياق الذكي للـ AI
 * يدعم:
 * - Project analysis
 * - Semantic search for relevant files
 * - Relevance ranking
 * - Token limit management
 * - Context compression
 * - Tree-sitter integration
 */

import { FileManager } from './file-manager.js';

// Temporary interfaces until these are properly implemented
interface TreeSitterAnalyzer {
  extractSignatures(content: string, language: string): Promise<string>;
}

interface EmbeddingsService {
  createEmbedding(text: string): Promise<number[]>;
}
import path from 'path';
import fs from 'fs-extra';

/**
 * Project information
 */
export interface ProjectInfo {
  name: string;
  type: string; // 'node', 'python', 'java', etc.
  structure: ProjectStructure;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  entryPoints: string[];
  frameworks: string[];
  languages: string[];
}

/**
 * Project structure
 */
export interface ProjectStructure {
  rootDir: string;
  srcDir?: string;
  testDir?: string;
  configFiles: string[];
  mainFiles: string[];
  totalFiles: number;
  totalLines: number;
}

/**
 * File with relevance score
 */
export interface ScoredFile {
  path: string;
  content: string;
  similarity: number;
  importance: number;
  size: number;
  language: string;
}

/**
 * Compressed context
 */
export interface CompressedContext {
  fullFiles: string[];           // Files included fully
  signatures: string[];          // Files with signatures only
  summaries: string[];          // File summaries
  totalTokens: number;
  compressionRatio: number;
}

/**
 * Built context
 */
export interface BuiltContext {
  projectInfo: ProjectInfo;
  files: CompressedContext;
  relevantFiles: ScoredFile[];
  metadata: {
    totalFilesAnalyzed: number;
    filesIncluded: number;
    compressionRatio: number;
    buildTime: number;
  };
}

/**
 * Smart Context Builder Configuration
 */
export interface ContextBuilderConfig {
  maxTokens?: number;              // Maximum tokens in context
  maxFiles?: number;               // Maximum files to include
  minSimilarity?: number;          // Minimum similarity threshold
  includeTests?: boolean;          // Include test files
  includeConfig?: boolean;         // Include config files
  compressionEnabled?: boolean;    // Enable context compression
  useEmbeddings?: boolean;         // Use semantic search
}

/**
 * Smart Context Builder Class
 */
export class SmartContextBuilder {
  private embeddings?: EmbeddingsService;
  private treeSitter?: TreeSitterAnalyzer;
  private fileManager: FileManager;
  private config: Required<ContextBuilderConfig>;
  private projectInfo?: ProjectInfo;

  constructor(
    fileManager: FileManager,
    embeddingsService?: EmbeddingsService,
    treeSitterAnalyzer?: TreeSitterAnalyzer,
    config?: ContextBuilderConfig
  ) {
    this.fileManager = fileManager;
    this.embeddings = embeddingsService;
    this.treeSitter = treeSitterAnalyzer; // Don't instantiate - use if provided

    // Default config
    this.config = {
      maxTokens: config?.maxTokens || 100000, // ~75k words
      maxFiles: config?.maxFiles || 20,
      minSimilarity: config?.minSimilarity || 0.3,
      includeTests: config?.includeTests ?? true,
      includeConfig: config?.includeConfig ?? true,
      compressionEnabled: config?.compressionEnabled ?? true,
      useEmbeddings: config?.useEmbeddings ?? true,
    };
  }

  /**
   * Main method: Build context for user request
   */
  async buildContext(userRequest: string): Promise<BuiltContext> {
    const startTime = Date.now();

    // 1. Analyze project (cache result)
    if (!this.projectInfo) {
      this.projectInfo = await this.analyzeProject();
    }

    // 2. Find relevant files
    let relevantFiles: ScoredFile[];

    if (this.config.useEmbeddings && this.embeddings) {
      relevantFiles = await this.findRelevantFilesWithEmbeddings(userRequest);
    } else {
      relevantFiles = await this.findRelevantFilesWithKeywords(userRequest);
    }

    // 3. Rank by relevance and importance
    const rankedFiles = this.rankByRelevance(relevantFiles, userRequest);

    // 4. Compress context to fit token limit
    const compressedContext = await this.compressContext(
      rankedFiles.slice(0, this.config.maxFiles)
    );

    const buildTime = Date.now() - startTime;

    return {
      projectInfo: this.projectInfo,
      files: compressedContext,
      relevantFiles: rankedFiles,
      metadata: {
        totalFilesAnalyzed: relevantFiles.length,
        filesIncluded: compressedContext.fullFiles.length + compressedContext.signatures.length,
        compressionRatio: compressedContext.compressionRatio,
        buildTime,
      },
    };
  }

  /**
   * Analyze project structure and metadata
   */
  private async analyzeProject(): Promise<ProjectInfo> {
    const rootDir = process.cwd();

    // Read package.json if exists
    let packageJson: any = {};
    const packagePath = path.join(rootDir, 'package.json');

    if (await fs.pathExists(packagePath)) {
      packageJson = await fs.readJson(packagePath);
    }

    // Detect project type
    const projectType = this.detectProjectType(rootDir, packageJson);

    // Analyze structure
    const structure = await this.analyzeStructure(rootDir);

    // Extract dependencies
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});

    // Detect frameworks
    const frameworks = this.detectFrameworks(dependencies, devDependencies);

    // Detect languages
    const languages = this.detectLanguages(structure.mainFiles);

    // Find entry points
    const entryPoints = this.findEntryPoints(packageJson, structure);

    return {
      name: packageJson.name || path.basename(rootDir),
      type: projectType,
      structure,
      dependencies,
      devDependencies,
      scripts: packageJson.scripts || {},
      entryPoints,
      frameworks,
      languages,
    };
  }

  /**
   * Detect project type
   */
  private detectProjectType(rootDir: string, packageJson: any): string {
    if (packageJson.dependencies) {
      if (packageJson.dependencies['react']) return 'react';
      if (packageJson.dependencies['vue']) return 'vue';
      if (packageJson.dependencies['angular']) return 'angular';
      if (packageJson.dependencies['next']) return 'nextjs';
      if (packageJson.dependencies['express']) return 'express';
      if (packageJson.dependencies['fastify']) return 'fastify';
      return 'node';
    }

    // Check for other languages
    if (fs.existsSync(path.join(rootDir, 'requirements.txt'))) return 'python';
    if (fs.existsSync(path.join(rootDir, 'pom.xml'))) return 'java';
    if (fs.existsSync(path.join(rootDir, 'Cargo.toml'))) return 'rust';
    if (fs.existsSync(path.join(rootDir, 'go.mod'))) return 'go';

    return 'unknown';
  }

  /**
   * Analyze project structure
   */
  private async analyzeStructure(rootDir: string): Promise<ProjectStructure> {
    const configFiles: string[] = [];
    const mainFiles: string[] = [];
    let totalFiles = 0;
    let totalLines = 0;

    // Find src directory
    let srcDir: string | undefined;
    for (const dir of ['src', 'lib', 'app']) {
      const dirPath = path.join(rootDir, dir);
      if (await fs.pathExists(dirPath)) {
        srcDir = dir;
        break;
      }
    }

    // Find test directory
    let testDir: string | undefined;
    for (const dir of ['test', 'tests', '__tests__', 'spec']) {
      const dirPath = path.join(rootDir, dir);
      if (await fs.pathExists(dirPath)) {
        testDir = dir;
        break;
      }
    }

    // Scan files
    const allFiles = await this.fileManager.listFiles();

    for (const file of allFiles) {
      // Skip node_modules, dist, etc.
      if (this.shouldIgnoreFile(file)) continue;

      totalFiles++;

      // Categorize files
      if (this.isConfigFile(file)) {
        configFiles.push(file);
      }

      if (this.isMainFile(file)) {
        mainFiles.push(file);
      }

      // Count lines
      try {
        const content = await this.fileManager.readFile(file);
        if (content) {
          totalLines += content.split('\n').length;
        }
      } catch (error) {
        // Ignore errors
      }
    }

    return {
      rootDir,
      srcDir,
      testDir,
      configFiles,
      mainFiles,
      totalFiles,
      totalLines,
    };
  }

  /**
   * Find relevant files using embeddings (semantic search)
   */
  private async findRelevantFilesWithEmbeddings(query: string): Promise<ScoredFile[]> {
    if (!this.embeddings) {
      return this.findRelevantFilesWithKeywords(query);
    }

    // Create query embedding
    const queryEmbedding = await this.embeddings.createEmbedding(query);

    // Get all files
    const allFiles = await this.fileManager.listFiles();
    const scored: ScoredFile[] = [];

    // Score each file
    for (const filePath of allFiles) {
      // Skip ignored files
      if (this.shouldIgnoreFile(filePath)) continue;

      try {
        const content = await this.fileManager.readFile(filePath);

        // Skip empty or very large files
        if (!content || content.length > 100000) continue;

        // Create file embedding
        const fileEmbedding = await this.embeddings.createEmbedding(
          this.extractKeyContent(content, filePath)
        );

        // Calculate similarity
        const similarity = this.cosineSimilarity(queryEmbedding, fileEmbedding);

        // Skip low similarity
        if (similarity < this.config.minSimilarity) continue;

        // Calculate importance based on file characteristics
        const importance = this.calculateImportance(filePath, content);

        scored.push({
          path: filePath,
          content,
          similarity,
          importance,
          size: content.length,
          language: this.detectLanguage(filePath),
        });
      } catch (error) {
        // Ignore errors for individual files
        continue;
      }
    }

    return scored;
  }

  /**
   * Find relevant files using keywords (fallback)
   */
  private async findRelevantFilesWithKeywords(query: string): Promise<ScoredFile[]> {
    const keywords = this.extractKeywords(query);
    const allFiles = await this.fileManager.listFiles();
    const scored: ScoredFile[] = [];

    for (const filePath of allFiles) {
      if (this.shouldIgnoreFile(filePath)) continue;

      try {
        const content = await this.fileManager.readFile(filePath);

        if (!content || content.length > 100000) continue;

        // Calculate keyword match score
        let score = 0;
        const lowerContent = content.toLowerCase();
        const lowerPath = filePath.toLowerCase();

        for (const keyword of keywords) {
          const keywordLower = keyword.toLowerCase();

          // Path matches are more important
          if (lowerPath.includes(keywordLower)) {
            score += 2;
          }

          // Content matches
          const matches = (lowerContent.match(new RegExp(keywordLower, 'g')) || []).length;
          score += Math.min(matches * 0.1, 2); // Cap at 2 points
        }

        if (score > 0) {
          const importance = this.calculateImportance(filePath, content);

          scored.push({
            path: filePath,
            content,
            similarity: score / (keywords.length * 2), // Normalize 0-1
            importance,
            size: content.length,
            language: this.detectLanguage(filePath),
          });
        }
      } catch (error) {
        continue;
      }
    }

    return scored;
  }

  /**
   * Rank files by combined relevance and importance
   */
  private rankByRelevance(files: ScoredFile[], query: string): ScoredFile[] {
    return files.sort((a, b) => {
      // Combined score: 70% similarity + 30% importance
      const scoreA = a.similarity * 0.7 + a.importance * 0.3;
      const scoreB = b.similarity * 0.7 + b.importance * 0.3;
      return scoreB - scoreA;
    });
  }

  /**
   * Compress context to fit token limit
   */
  private async compressContext(files: ScoredFile[]): Promise<CompressedContext> {
    const fullFiles: string[] = [];
    const signatures: string[] = [];
    const summaries: string[] = [];
    let totalTokens = 0;
    let originalTokens = 0;

    for (const file of files) {
      const estimatedTokens = this.estimateTokens(file.content);
      originalTokens += estimatedTokens;

      // Small files: include fully
      if (file.size < 2000) {
        fullFiles.push(`// ${file.path}\n${file.content}`);
        totalTokens += estimatedTokens;
        continue;
      }

      // Medium files: extract signatures if compression enabled and treeSitter available
      if (this.config.compressionEnabled && this.treeSitter && file.size < 10000) {
        try {
          const sig = await this.treeSitter.extractSignatures(file.content, file.language);
          signatures.push(`// ${file.path} (signatures)\n${sig}`);
          totalTokens += this.estimateTokens(sig);
          continue;
        } catch (error) {
          // Fallback to summary
        }
      }

      // Large files: create summary
      const summary = this.createFileSummary(file);
      summaries.push(summary);
      totalTokens += this.estimateTokens(summary);

      // Stop if we exceed token limit
      if (totalTokens > this.config.maxTokens) {
        break;
      }
    }

    const compressionRatio = originalTokens > 0 ? totalTokens / originalTokens : 1;

    return {
      fullFiles,
      signatures,
      summaries,
      totalTokens,
      compressionRatio,
    };
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Calculate file importance based on characteristics
   */
  private calculateImportance(filePath: string, content: string): number {
    let score = 0.5; // Base score

    // Entry points and main files are more important
    if (this.isMainFile(filePath)) score += 0.3;

    // Config files
    if (this.isConfigFile(filePath)) score += 0.1;

    // Files in src directory
    if (filePath.includes('/src/') || filePath.includes('\\src\\')) score += 0.2;

    // Recently modified (if we have git info)
    // TODO: Add git integration

    // File size (medium files are usually more important)
    const size = content.length;
    if (size > 1000 && size < 5000) score += 0.1;

    // Has exports (likely API)
    if (content.includes('export ')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Extract key content for embedding
   */
  private extractKeyContent(content: string, filePath: string): string {
    // For code files, extract important parts
    if (this.isCodeFile(filePath)) {
      // Extract function/class names, comments, exports
      const lines = content.split('\n');
      const important: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('export ') ||
          trimmed.startsWith('function ') ||
          trimmed.startsWith('class ') ||
          trimmed.startsWith('interface ') ||
          trimmed.startsWith('type ') ||
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*')
        ) {
          important.push(line);
        }
      }

      return important.join('\n').substring(0, 5000);
    }

    // For other files, just truncate
    return content.substring(0, 5000);
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Remove common words
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Estimate tokens from text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Create file summary
   */
  private createFileSummary(file: ScoredFile): string {
    const lines = file.content.split('\n');
    const summary: string[] = [
      `// ${file.path} (${file.size} bytes, ${lines.length} lines)`,
    ];

    // Extract first 10 significant lines
    let count = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && count < 10) {
        summary.push(line);
        count++;
      }
    }

    summary.push('// ... (truncated)');

    return summary.join('\n');
  }

  /**
   * Detect frameworks from dependencies
   */
  private detectFrameworks(deps: string[], devDeps: string[]): string[] {
    const all = [...deps, ...devDeps];
    const frameworks: string[] = [];

    const frameworkMap: Record<string, string> = {
      react: 'React',
      vue: 'Vue',
      '@angular/core': 'Angular',
      next: 'Next.js',
      express: 'Express',
      fastify: 'Fastify',
      '@nestjs/core': 'NestJS',
      svelte: 'Svelte',
    };

    for (const [key, value] of Object.entries(frameworkMap)) {
      if (all.includes(key)) {
        frameworks.push(value);
      }
    }

    return frameworks;
  }

  /**
   * Detect languages from file extensions
   */
  private detectLanguages(files: string[]): string[] {
    const languages = new Set<string>();

    for (const file of files) {
      const ext = path.extname(file);
      switch (ext) {
        case '.ts':
        case '.tsx':
          languages.add('TypeScript');
          break;
        case '.js':
        case '.jsx':
          languages.add('JavaScript');
          break;
        case '.py':
          languages.add('Python');
          break;
        case '.java':
          languages.add('Java');
          break;
        case '.go':
          languages.add('Go');
          break;
        case '.rs':
          languages.add('Rust');
          break;
      }
    }

    return Array.from(languages);
  }

  /**
   * Find entry points
   */
  private findEntryPoints(packageJson: any, structure: ProjectStructure): string[] {
    const entryPoints: string[] = [];

    // From package.json
    if (packageJson.main) entryPoints.push(packageJson.main);
    if (packageJson.module) entryPoints.push(packageJson.module);

    // Common entry points
    const common = ['index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js'];

    for (const entry of common) {
      if (structure.srcDir) {
        entryPoints.push(path.join(structure.srcDir, entry));
      } else {
        entryPoints.push(entry);
      }
    }

    return entryPoints;
  }

  /**
   * Detect language from file path
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
    };
    return map[ext] || 'unknown';
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(filePath: string): boolean {
    const ignore = [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '.next',
      '.turbo',
      'out',
    ];

    return ignore.some(pattern => filePath.includes(pattern));
  }

  /**
   * Check if config file
   */
  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'webpack.config',
      '.eslintrc',
      '.prettierrc',
      'jest.config',
      'vite.config',
    ];

    return configPatterns.some(pattern => filePath.includes(pattern));
  }

  /**
   * Check if main file
   */
  private isMainFile(filePath: string): boolean {
    const mainPatterns = ['index.', 'main.', 'app.', 'server.'];
    const fileName = path.basename(filePath);
    return mainPatterns.some(pattern => fileName.startsWith(pattern));
  }

  /**
   * Check if code file
   */
  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Clear cached project info
   */
  clearCache(): void {
    this.projectInfo = undefined;
  }
}

/**
 * Create Smart Context Builder instance
 */
export function createSmartContextBuilder(
  fileManager: FileManager,
  embeddingsService?: EmbeddingsService,
  treeSitterAnalyzer?: TreeSitterAnalyzer,
  config?: ContextBuilderConfig
): SmartContextBuilder {
  return new SmartContextBuilder(fileManager, embeddingsService, treeSitterAnalyzer, config);
}
