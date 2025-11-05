// devops-agent.ts
// ============================================
// 🚀 DevOps Agent - الناشر
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';
import type { GeneratedCode, CodeFile } from '../core/god-mode.js';

export interface DeploymentConfig {
  platform: 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'docker' | 'kubernetes' | 'heroku';
  environment: 'development' | 'staging' | 'production';
  config: Record<string, any>;
  scripts?: string[];
}

export interface CICDPipeline {
  provider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'travis';
  stages: string[];
  config: string;
  path: string;
}

export interface InfrastructureFile {
  type: 'dockerfile' | 'docker-compose' | 'kubernetes' | 'terraform' | 'helm';
  path: string;
  content: string;
}

export interface DevOpsResults {
  deploymentConfigs: DeploymentConfig[];
  cicdPipelines: CICDPipeline[];
  infrastructureFiles: InfrastructureFile[];
  environmentFiles: CodeFile[];
  readiness: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  summary: string;
}

export class DevOpsAgent {
  private aiAdapter: UnifiedAIAdapter;
  private provider: AIProvider;

  constructor(
    config: { deepseek?: string; claude?: string; openai?: string },
    provider: AIProvider = 'auto'
  ) {
    const hasValidClaude = config.claude?.startsWith('sk-ant-');

    this.aiAdapter = new UnifiedAIAdapter({
      deepseek: config.deepseek,
      claude: config.claude,
      openai: config.openai,
      defaultProvider: hasValidClaude ? 'claude' : 'deepseek',
    });
    this.provider = provider;
  }

  async prepare(code: GeneratedCode, targetPlatform?: string): Promise<DevOpsResults> {
    const deploymentConfigs: DeploymentConfig[] = [];
    const cicdPipelines: CICDPipeline[] = [];
    const infrastructureFiles: InfrastructureFile[] = [];
    const environmentFiles: CodeFile[] = [];

    // 1. Detect project type and tech stack
    const projectInfo = this.detectProjectType(code);

    // 2. Generate deployment configurations
    const deployConfigs = await this.generateDeploymentConfigs(code, projectInfo, targetPlatform);
    deploymentConfigs.push(...deployConfigs);

    // 3. Generate CI/CD pipeline
    const pipeline = await this.generateCICDPipeline(code, projectInfo);
    if (pipeline) {
      cicdPipelines.push(pipeline);
    }

    // 4. Generate infrastructure files
    const infraFiles = await this.generateInfrastructure(code, projectInfo);
    infrastructureFiles.push(...infraFiles);

    // 5. Generate environment configuration
    const envFiles = await this.generateEnvironmentFiles(code, projectInfo);
    environmentFiles.push(...envFiles);

    // 6. Check deployment readiness
    const readiness = await this.checkDeploymentReadiness(
      code,
      deploymentConfigs,
      cicdPipelines,
      infrastructureFiles
    );

    return {
      deploymentConfigs,
      cicdPipelines,
      infrastructureFiles,
      environmentFiles,
      readiness,
      summary: this.generateSummary(
        deploymentConfigs,
        cicdPipelines,
        infrastructureFiles,
        readiness
      ),
    };
  }

  // ============================================
  // Detect project type
  // ============================================
  private detectProjectType(code: GeneratedCode): {
    type: string;
    framework?: string;
    language: string;
    hasDatabase: boolean;
    hasAPI: boolean;
  } {
    const files = code.files.map((f) => f.path);
    const contents = code.files.map((f) => f.content).join('\n');

    // Detect framework
    let framework: string | undefined;
    let type = 'web';

    if (files.some((f) => f.includes('next.config'))) framework = 'nextjs';
    else if (files.some((f) => f.includes('vite.config'))) framework = 'vite';
    else if (files.some((f) => f.includes('angular.json'))) framework = 'angular';
    else if (files.some((f) => f.includes('vue.config'))) framework = 'vue';
    else if (contents.includes('express')) framework = 'express';
    else if (contents.includes('fastapi')) framework = 'fastapi';

    // Detect language
    const language = code.files[0]?.language || 'javascript';

    // Detect database
    const hasDatabase = contents.match(/mongoose|prisma|sequelize|sqlalchemy|pg|mysql/) !== null;

    // Detect API
    const hasAPI = contents.match(/api|endpoint|router|@app\.route/) !== null;

    return { type, framework, language, hasDatabase, hasAPI };
  }

  // ============================================
  // Generate deployment configurations
  // ============================================
  private async generateDeploymentConfigs(
    code: GeneratedCode,
    projectInfo: any,
    targetPlatform?: string
  ): Promise<DeploymentConfig[]> {
    const configs: DeploymentConfig[] = [];

    // Suggest best platforms based on project type
    const platforms = targetPlatform ? [targetPlatform] : this.suggestPlatforms(projectInfo);

    for (const platform of platforms) {
      const config = await this.createPlatformConfig(code, projectInfo, platform);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  // ============================================
  // Suggest deployment platforms
  // ============================================
  private suggestPlatforms(projectInfo: any): string[] {
    const { framework, hasDatabase, hasAPI } = projectInfo;

    // Next.js → Vercel
    if (framework === 'nextjs') return ['vercel', 'netlify'];

    // Static sites → Netlify/Vercel
    if (!hasAPI && !hasDatabase) return ['netlify', 'vercel'];

    // Full-stack → Multiple options
    if (hasAPI && hasDatabase) return ['aws', 'docker'];

    // API-only → Docker/AWS
    if (hasAPI) return ['docker', 'aws'];

    return ['vercel'];
  }

  // ============================================
  // Create platform-specific config
  // ============================================
  private async createPlatformConfig(
    code: GeneratedCode,
    projectInfo: any,
    platform: string
  ): Promise<DeploymentConfig | null> {
    const prompt = `
Create deployment configuration for ${platform}:

Project Type: ${projectInfo.type}
Framework: ${projectInfo.framework || 'none'}
Language: ${projectInfo.language}
Has Database: ${projectInfo.hasDatabase}
Has API: ${projectInfo.hasAPI}

Files:
${code.files.map((f) => `- ${f.path}`).join('\n')}

Generate:
1. Platform-specific configuration
2. Build scripts
3. Environment variables needed
4. Deploy commands
5. Best practices for ${platform}

Output format (JSON):
\`\`\`json
{
  "platform": "${platform}",
  "environment": "production",
  "config": {
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "nodeVersion": "18"
  },
  "scripts": [
    "npm install",
    "npm run build"
  ]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseDeploymentConfig(response);
    } catch (error) {
      console.error(`Failed to create ${platform} config`);
      return null;
    }
  }

  // ============================================
  // Generate CI/CD pipeline
  // ============================================
  private async generateCICDPipeline(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<CICDPipeline | null> {
    const prompt = `
Create a complete CI/CD pipeline:

Project Type: ${projectInfo.type}
Framework: ${projectInfo.framework || 'none'}
Language: ${projectInfo.language}

Pipeline should include:
1. 🔍 Linting & Code Quality
2. 🧪 Testing (unit, integration)
3. 🏗️ Build
4. 🔒 Security Scanning
5. 🚀 Deploy (staging & production)
6. 📊 Monitoring

Use GitHub Actions (most common).

Output format:
\`\`\`yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ... complete pipeline here
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseCICDPipeline(response);
    } catch (error) {
      console.error('Failed to generate CI/CD pipeline');
      return null;
    }
  }

  // ============================================
  // Generate infrastructure files
  // ============================================
  private async generateInfrastructure(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<InfrastructureFile[]> {
    const files: InfrastructureFile[] = [];

    // 1. Dockerfile
    const dockerfile = await this.generateDockerfile(code, projectInfo);
    if (dockerfile) files.push(dockerfile);

    // 2. Docker Compose (if has database)
    if (projectInfo.hasDatabase) {
      const compose = await this.generateDockerCompose(code, projectInfo);
      if (compose) files.push(compose);
    }

    // 3. Kubernetes (optional, for larger projects)
    if (code.files.length > 10) {
      const k8s = await this.generateKubernetes(code, projectInfo);
      if (k8s) files.push(k8s);
    }

    return files;
  }

  // ============================================
  // Generate Dockerfile
  // ============================================
  private async generateDockerfile(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<InfrastructureFile | null> {
    const prompt = `
Create an optimized Dockerfile:

Language: ${projectInfo.language}
Framework: ${projectInfo.framework || 'none'}

Requirements:
1. Multi-stage build (smaller image)
2. Security best practices
3. Layer caching optimization
4. Non-root user
5. Health checks

Output format:
\`\`\`dockerfile
# Dockerfile content here
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const content = this.extractCode(response, 'dockerfile');

      if (content) {
        return {
          type: 'dockerfile',
          path: 'Dockerfile',
          content,
        };
      }
    } catch (error) {
      console.error('Failed to generate Dockerfile');
    }

    return null;
  }

  // ============================================
  // Generate Docker Compose
  // ============================================
  private async generateDockerCompose(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<InfrastructureFile | null> {
    const prompt = `
Create docker-compose.yml for local development:

Project: ${projectInfo.framework || projectInfo.type}
Has Database: ${projectInfo.hasDatabase}
Has API: ${projectInfo.hasAPI}

Include:
1. Application service
2. Database service (if needed)
3. Redis (for caching, if API)
4. Networks & volumes
5. Environment variables

Output format:
\`\`\`yaml
# docker-compose.yml
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const content = this.extractCode(response, 'yaml');

      if (content) {
        return {
          type: 'docker-compose',
          path: 'docker-compose.yml',
          content,
        };
      }
    } catch (error) {
      console.error('Failed to generate docker-compose');
    }

    return null;
  }

  // ============================================
  // Generate Kubernetes config
  // ============================================
  private async generateKubernetes(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<InfrastructureFile | null> {
    const prompt = `
Create Kubernetes deployment configuration:

Project: ${projectInfo.framework || projectInfo.type}

Include:
1. Deployment
2. Service
3. ConfigMap
4. Secrets (placeholder)
5. Ingress
6. HPA (Horizontal Pod Autoscaler)

Output format:
\`\`\`yaml
# k8s/deployment.yml
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      const content = this.extractCode(response, 'yaml');

      if (content) {
        return {
          type: 'kubernetes',
          path: 'k8s/deployment.yml',
          content,
        };
      }
    } catch (error) {
      console.error('Failed to generate Kubernetes config');
    }

    return null;
  }

  // ============================================
  // Generate environment files
  // ============================================
  private async generateEnvironmentFiles(
    code: GeneratedCode,
    projectInfo: any
  ): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    // .env.example
    const envExampleContent = this.createEnvExample(projectInfo);
    const envExample: CodeFile = {
      path: '.env.example',
      language: 'shell',
      content: envExampleContent,
      lines: envExampleContent.split('\n').length,
    };
    files.push(envExample);

    // .env.production
    const envProdContent = this.createEnvProduction(projectInfo);
    const envProd: CodeFile = {
      path: '.env.production',
      language: 'shell',
      content: envProdContent,
      lines: envProdContent.split('\n').length,
    };
    files.push(envProd);

    return files;
  }

  // ============================================
  // Create .env.example
  // ============================================
  private createEnvExample(projectInfo: any): string {
    let env = `# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

`;

    if (projectInfo.hasDatabase) {
      env += `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

`;
    }

    if (projectInfo.hasAPI) {
      env += `# API Keys
API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here

`;
    }

    env += `# External Services
# Add your service keys here
`;

    return env;
  }

  // ============================================
  // Create .env.production
  // ============================================
  private createEnvProduction(projectInfo: any): string {
    return `# Production Environment
NODE_ENV=production
PORT=\${PORT}
APP_URL=\${APP_URL}

# IMPORTANT: Set these in your deployment platform
# Never commit actual values to git
${projectInfo.hasDatabase ? 'DATABASE_URL=${DATABASE_URL}\n' : ''}${projectInfo.hasAPI ? 'API_KEY=${API_KEY}\nJWT_SECRET=${JWT_SECRET}\n' : ''}`;
  }

  // ============================================
  // Check deployment readiness
  // ============================================
  private async checkDeploymentReadiness(
    code: GeneratedCode,
    deployConfigs: DeploymentConfig[],
    pipelines: CICDPipeline[],
    infraFiles: InfrastructureFile[]
  ): Promise<{ score: number; issues: string[]; recommendations: string[] }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check configurations
    if (deployConfigs.length === 0) {
      issues.push('No deployment configuration found');
      score -= 30;
    }

    // Check CI/CD
    if (pipelines.length === 0) {
      recommendations.push('Add CI/CD pipeline for automated deployments');
      score -= 20;
    }

    // Check infrastructure
    if (infraFiles.length === 0) {
      recommendations.push('Add Docker configuration for containerization');
      score -= 15;
    }

    // Check environment files
    const hasEnv = code.files.some((f) => f.path.includes('.env'));
    if (!hasEnv) {
      issues.push('Missing environment configuration files');
      score -= 20;
    }

    // Check build scripts
    const packageJson = code.files.find((f) => f.path.includes('package.json'));
    if (packageJson && !packageJson.content.includes('build')) {
      issues.push('Missing build script in package.json');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  // ============================================
  // Call Claude API
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'devops',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse deployment config
  // ============================================
  private parseDeploymentConfig(response: string): DeploymentConfig | null {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return null;

      const data = JSON.parse(jsonMatch[1]);
      return data as DeploymentConfig;
    } catch (error) {
      console.error('Failed to parse deployment config');
      return null;
    }
  }

  // ============================================
  // Parse CI/CD pipeline
  // ============================================
  private parseCICDPipeline(response: string): CICDPipeline | null {
    try {
      const yamlMatch = response.match(/```yaml\n([\s\S]*?)\n```/);
      if (!yamlMatch) return null;

      const content = yamlMatch[1];

      // Extract stages from YAML
      const stages: string[] = [];
      const jobMatches = content.matchAll(/^\s+([a-z-]+):/gm);
      for (const match of jobMatches) {
        stages.push(match[1]);
      }

      return {
        provider: 'github-actions',
        stages,
        config: content,
        path: '.github/workflows/ci-cd.yml',
      };
    } catch (error) {
      console.error('Failed to parse CI/CD pipeline');
      return null;
    }
  }

  // ============================================
  // Extract code from response
  // ============================================
  private extractCode(response: string, type?: string): string | null {
    const pattern = type
      ? new RegExp(`\`\`\`${type}\\n([\\s\\S]*?)\`\`\``)
      : /```(?:\w+)?\n([\s\S]*?)```/;

    const match = response.match(pattern);
    return match ? match[1].trim() : null;
  }

  // ============================================
  // Generate summary
  // ============================================
  private generateSummary(
    deployConfigs: DeploymentConfig[],
    pipelines: CICDPipeline[],
    infraFiles: InfrastructureFile[],
    readiness: any
  ): string {
    const readinessEmoji = readiness.score >= 80 ? '✅' : readiness.score >= 60 ? '⚠️' : '🔴';

    return `
# 🚀 DevOps Summary

## Deployment Readiness: ${readinessEmoji} ${readiness.score}%

## Generated Configurations:
- 📦 Deployment Configs: ${deployConfigs.length}
  ${deployConfigs.map((c) => `  - ${c.platform} (${c.environment})`).join('\n  ')}
- 🔄 CI/CD Pipelines: ${pipelines.length}
  ${pipelines.map((p) => `  - ${p.provider} (${p.stages.length} stages)`).join('\n  ')}
- 🏗️ Infrastructure Files: ${infraFiles.length}
  ${infraFiles.map((f) => `  - ${f.type}`).join('\n  ')}

${readiness.issues.length > 0 ? `\n## ❌ Issues:\n${readiness.issues.map((i: any) => `- ${i}`).join('\n')}` : ''}

${readiness.recommendations.length > 0 ? `\n## 💡 Recommendations:\n${readiness.recommendations.map((r: any) => `- ${r}`).join('\n')}` : ''}

## Next Steps:
1. Review and customize deployment configurations
2. Set up environment variables in your platform
3. Test deployment in staging environment
4. Configure monitoring and alerts
5. Set up automated backups (if using database)

${readiness.score >= 80 ? '✅ Project is ready for deployment!' : '⚠️ Address issues before deploying to production.'}
    `.trim();
  }
}
