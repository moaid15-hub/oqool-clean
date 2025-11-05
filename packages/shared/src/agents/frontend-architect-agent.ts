// frontend-architect-agent.ts
// ============================================
// 🎨 Frontend Architect Agent - مهندس الواجهات
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

export interface ComponentStructure {
  name: string;
  type: 'page' | 'layout' | 'component' | 'hook' | 'util' | 'context';
  path: string;
  dependencies: string[];
  props?: Record<string, string>;
  state?: string[];
  description: string;
}

export interface DesignSystem {
  colors: Record<string, Record<string, string> | string>;
  typography: Record<string, any>;
  spacing: Record<string, string>;
  components: string[];
  tokens: Record<string, any>;
}

export interface FrontendArchitecture {
  framework: 'react' | 'vue' | 'angular' | 'svelte' | 'nextjs';
  structure: ComponentStructure[];
  designSystem: DesignSystem;
  routing: {
    type: 'file-based' | 'config-based';
    routes: Array<{ path: string; component: string }>;
  };
  stateManagement: {
    solution: 'redux' | 'zustand' | 'context' | 'recoil' | 'mobx' | 'none';
    stores: string[];
  };
  styling: {
    solution: 'tailwind' | 'css-modules' | 'styled-components' | 'emotion' | 'sass';
    approach: string;
  };
  fileStructure: string;
  recommendations: string[];
}

export class FrontendArchitectAgent {
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

  async design(requirements: {
    description: string;
    features: string[];
    pages?: string[];
    framework?: string;
    styling?: string;
  }): Promise<FrontendArchitecture> {
    // 1. Design component architecture
    const structure = await this.designComponentStructure(requirements);

    // 2. Create design system
    const designSystem = await this.createDesignSystem(requirements);

    // 3. Plan routing
    const routing = await this.planRouting(requirements, structure);

    // 4. Choose state management
    const stateManagement = await this.chooseStateManagement(requirements, structure);

    // 5. Plan styling approach
    const styling = await this.planStyling(requirements);

    // 6. Generate file structure
    const fileStructure = this.generateFileStructure(structure, requirements.framework || 'react');

    // 7. Provide recommendations
    const recommendations = await this.generateRecommendations(
      requirements,
      structure,
      routing,
      stateManagement
    );

    return {
      framework: (requirements.framework as any) || 'react',
      structure,
      designSystem,
      routing,
      stateManagement,
      styling,
      fileStructure,
      recommendations,
    };
  }

  // ============================================
  // Design component structure
  // ============================================
  private async designComponentStructure(requirements: any): Promise<ComponentStructure[]> {
    const prompt = `
Design a scalable component architecture for this website:

Description: ${requirements.description}

Features:
${requirements.features.map((f: string) => `- ${f}`).join('\n')}

${requirements.pages ? `Pages:\n${requirements.pages.map((p: string) => `- ${p}`).join('\n')}` : ''}

Framework: ${requirements.framework || 'React'}

Create a complete component hierarchy including:
1. 📄 Pages (top-level routes)
2. 🎭 Layouts (shared page structures)
3. 🧩 Components (reusable UI pieces)
4. 🪝 Custom Hooks (shared logic)
5. 🔧 Utils (helper functions)
6. 🌐 Context/State (global state)

For each component, specify:
- Name (PascalCase for components)
- Type (page/layout/component/hook/util/context)
- Path (file location)
- Dependencies (what it uses)
- Props (if component)
- State (if stateful)
- Description

Output format (JSON):
\`\`\`json
{
  "components": [
    {
      "name": "HomePage",
      "type": "page",
      "path": "src/pages/HomePage.tsx",
      "dependencies": ["Header", "Hero", "Features", "Footer"],
      "description": "Main landing page"
    },
    {
      "name": "Header",
      "type": "component",
      "path": "src/components/layout/Header.tsx",
      "dependencies": ["Logo", "Navigation"],
      "props": {
        "transparent": "boolean",
        "fixed": "boolean"
      },
      "description": "Site header with navigation"
    }
  ]
}
\`\`\`

Think in terms of:
- Component composition (small, reusable components)
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Scalability and maintainability
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseComponents(response);
    } catch (error) {
      console.error('Failed to design component structure');
      return [];
    }
  }

  // ============================================
  // Create design system
  // ============================================
  private async createDesignSystem(requirements: any): Promise<DesignSystem> {
    const prompt = `
Create a design system for this website:

Description: ${requirements.description}
Features: ${requirements.features.join(', ')}

Design a cohesive design system including:

1. 🎨 Color Palette:
   - Primary colors (brand)
   - Secondary colors
   - Neutral colors (grays)
   - Semantic colors (success, error, warning, info)
   - Text colors

2. 📝 Typography:
   - Font families (heading, body, mono)
   - Font sizes (scale)
   - Font weights
   - Line heights
   - Letter spacing

3. 📏 Spacing Scale:
   - Consistent spacing units (4px base)
   - Padding/margin values

4. 🧩 Component Tokens:
   - Border radius
   - Shadows
   - Transitions
   - Z-index scale

Output format (JSON):
\`\`\`json
{
  "colors": {
    "primary": {
      "50": "#f0f9ff",
      "500": "#3b82f6",
      "900": "#1e3a8a"
    },
    "gray": {
      "50": "#f9fafb",
      "500": "#6b7280",
      "900": "#111827"
    }
  },
  "typography": {
    "fonts": {
      "heading": "Inter, sans-serif",
      "body": "Inter, sans-serif",
      "mono": "JetBrains Mono, monospace"
    },
    "sizes": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem"
    }
  },
  "spacing": {
    "1": "0.25rem",
    "2": "0.5rem",
    "4": "1rem"
  },
  "tokens": {
    "borderRadius": {
      "sm": "0.25rem",
      "md": "0.5rem",
      "lg": "1rem"
    },
    "shadows": {
      "sm": "0 1px 2px rgba(0,0,0,0.05)",
      "md": "0 4px 6px rgba(0,0,0,0.1)"
    }
  }
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseDesignSystem(response);
    } catch (error) {
      console.error('Failed to create design system');
      return this.getDefaultDesignSystem();
    }
  }

  // ============================================
  // Plan routing
  // ============================================
  private async planRouting(requirements: any, structure: ComponentStructure[]): Promise<any> {
    const pages = structure.filter((c) => c.type === 'page');
    const framework = requirements.framework || 'react';

    // File-based routing for Next.js/Nuxt
    if (framework === 'nextjs' || framework === 'nuxt') {
      return {
        type: 'file-based',
        routes: pages.map((p) => ({
          path: this.pageToRoute(p.name),
          component: p.path,
        })),
      };
    }

    // Config-based routing for React/Vue
    return {
      type: 'config-based',
      routes: pages.map((p) => ({
        path: this.pageToRoute(p.name),
        component: p.path,
      })),
    };
  }

  // ============================================
  // Choose state management
  // ============================================
  private async chooseStateManagement(
    requirements: any,
    structure: ComponentStructure[]
  ): Promise<any> {
    const hasAuth = requirements.features.some(
      (f: string) => f.toLowerCase().includes('auth') || f.toLowerCase().includes('login')
    );
    const hasComplexState = structure.length > 20;
    const isRealtime = requirements.features.some(
      (f: string) => f.toLowerCase().includes('realtime') || f.toLowerCase().includes('chat')
    );

    let solution: string;
    let stores: string[] = [];

    if (isRealtime || hasComplexState) {
      solution = 'zustand';
      stores = ['authStore', 'userStore', 'appStore'];
    } else if (hasAuth) {
      solution = 'context';
      stores = ['AuthContext', 'ThemeContext'];
    } else {
      solution = 'none';
      stores = [];
    }

    return { solution, stores };
  }

  // ============================================
  // Plan styling approach
  // ============================================
  private async planStyling(requirements: any): Promise<any> {
    const styling = requirements.styling || 'tailwind';

    const approaches: Record<string, string> = {
      tailwind: 'Utility-first CSS with Tailwind classes',
      'css-modules': 'Scoped CSS with CSS Modules',
      'styled-components': 'CSS-in-JS with styled-components',
      emotion: 'CSS-in-JS with Emotion',
      sass: 'Preprocessed CSS with SASS/SCSS',
    };

    return {
      solution: styling,
      approach: approaches[styling] || approaches['tailwind'],
    };
  }

  // ============================================
  // Generate file structure
  // ============================================
  private generateFileStructure(structure: ComponentStructure[], framework: string): string {
    const tree: Record<string, string[]> = {};

    // Group by directory
    for (const comp of structure) {
      const dir = comp.path.split('/').slice(0, -1).join('/');
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(comp.path.split('/').pop() || '');
    }

    let fileStructure = `
📁 ${framework === 'nextjs' ? 'app' : 'src'}/
`;

    const sortedDirs = Object.keys(tree).sort();
    for (const dir of sortedDirs) {
      const depth = dir.split('/').length - 1;
      const indent = '  '.repeat(depth);
      const dirName = dir.split('/').pop();
      fileStructure += `${indent}📁 ${dirName}/\n`;

      for (const file of tree[dir].sort()) {
        fileStructure += `${indent}  📄 ${file}\n`;
      }
    }

    return fileStructure;
  }

  // ============================================
  // Generate recommendations
  // ============================================
  private async generateRecommendations(
    requirements: any,
    structure: ComponentStructure[],
    routing: any,
    stateManagement: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Performance recommendations
    if (structure.length > 30) {
      recommendations.push('🚀 Use code splitting for large component tree');
      recommendations.push('⚡ Implement lazy loading for routes');
    }

    // State management recommendations
    if (stateManagement.solution === 'none' && structure.length > 15) {
      recommendations.push('🔄 Consider adding state management (Zustand or Context)');
    }

    // SEO recommendations
    if (requirements.framework === 'nextjs') {
      recommendations.push('🔍 Use Next.js metadata API for SEO');
      recommendations.push('🖼️ Optimize images with next/image');
    }

    // Accessibility
    recommendations.push('♿ Implement proper ARIA labels and semantic HTML');
    recommendations.push('⌨️ Ensure keyboard navigation works');

    // Testing
    recommendations.push('🧪 Add unit tests for components with Vitest');
    recommendations.push('🎭 Add E2E tests with Playwright');

    // Performance
    recommendations.push('📊 Set up Web Vitals monitoring');
    recommendations.push('🗜️ Enable gzip/brotli compression');

    return recommendations;
  }

  // ============================================
  // Helper: Page name to route
  // ============================================
  private pageToRoute(pageName: string): string {
    return (
      '/' +
      pageName
        .replace('Page', '')
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
    );
  }

  // ============================================
  // Call Claude API
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'architect',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse components
  // ============================================
  private parseComponents(response: string): ComponentStructure[] {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1]);
      return data.components || [];
    } catch (error) {
      console.error('Failed to parse components');
      return [];
    }
  }

  // ============================================
  // Parse design system
  // ============================================
  private parseDesignSystem(response: string): DesignSystem {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return this.getDefaultDesignSystem();

      const data = JSON.parse(jsonMatch[1]);
      return {
        colors: data.colors || {},
        typography: data.typography || {},
        spacing: data.spacing || {},
        components: data.components || [],
        tokens: data.tokens || {},
      };
    } catch (error) {
      console.error('Failed to parse design system');
      return this.getDefaultDesignSystem();
    }
  }

  // ============================================
  // Default design system
  // ============================================
  private getDefaultDesignSystem(): DesignSystem {
    return {
      colors: {
        primary: { '500': '#3b82f6' },
        gray: { '500': '#6b7280' },
      },
      typography: {
        fonts: { body: 'Inter, sans-serif' },
      },
      spacing: {
        '1': '0.25rem',
        '2': '0.5rem',
        '4': '1rem',
      },
      components: [],
      tokens: {},
    };
  }
}
