// ui-ux-designer-agent.ts
// ============================================
// 🎨 UI/UX Designer Agent - مصمم التجربة
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

export interface UIComponent {
  name: string;
  type: string;
  description: string;
  variants?: string[];
  states?: string[];
  accessibility: string[];
  code: string;
}

export interface PageDesign {
  pageName: string;
  sections: {
    name: string;
    type: 'hero' | 'features' | 'cta' | 'testimonials' | 'pricing' | 'footer' | 'custom';
    layout: string;
    components: string[];
    description: string;
  }[];
  mockup: string;
  wireframe: string;
}

export interface DesignResult {
  components: UIComponent[];
  pages: PageDesign[];
  designPrinciples: string[];
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    scale: string[];
  };
  responsive: {
    breakpoints: Record<string, string>;
    strategy: string;
  };
  animations: {
    transitions: string[];
    microInteractions: string[];
  };
}

export class UIUXDesignerAgent {
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
    projectName: string;
    description: string;
    targetAudience: string;
    pages: string[];
    style?: 'modern' | 'minimal' | 'playful' | 'professional' | 'dark' | 'elegant';
    brand?: {
      colors?: string[];
      personality?: string;
    };
  }): Promise<DesignResult> {
    // 1. Define color scheme
    const colorScheme = await this.designColorScheme(requirements);

    // 2. Define typography
    const typography = await this.designTypography(requirements);

    // 3. Design UI components
    const components = await this.designUIComponents(requirements, colorScheme);

    // 4. Design pages
    const pages = await this.designPages(requirements, components);

    // 5. Define responsive strategy
    const responsive = await this.designResponsive();

    // 6. Define animations
    const animations = await this.designAnimations(requirements);

    // 7. Design principles
    const designPrinciples = this.defineDesignPrinciples(requirements);

    return {
      components,
      pages,
      designPrinciples,
      colorScheme,
      typography,
      responsive,
      animations,
    };
  }

  // ============================================
  // Design color scheme
  // ============================================
  private async designColorScheme(requirements: any): Promise<any> {
    const style = requirements.style || 'modern';
    const brandColors = requirements.brand?.colors || [];

    const prompt = `
Design a beautiful color scheme for this website:

Project: ${requirements.projectName}
Style: ${style}
Target Audience: ${requirements.targetAudience}
${brandColors.length > 0 ? `Brand Colors: ${brandColors.join(', ')}` : ''}

Create a cohesive color palette with:
1. Primary color (main brand color)
2. Secondary color (supporting)
3. Accent color (CTAs, highlights)
4. Background colors (light mode)
5. Text colors (hierarchy)

Consider:
- Color psychology for target audience
- Accessibility (WCAG AA contrast ratios)
- Style alignment (${style})

Output format (JSON):
\`\`\`json
{
  "primary": "#3b82f6",
  "secondary": "#8b5cf6",
  "accent": "#f59e0b",
  "background": "#ffffff",
  "text": "#1f2937"
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      return this.getDefaultColors(style);
    }
  }

  // ============================================
  // Design typography
  // ============================================
  private async designTypography(requirements: any): Promise<any> {
    const style = requirements.style || 'modern';

    const prompt = `
Design typography system for this website:

Project: ${requirements.projectName}
Style: ${style}
Target Audience: ${requirements.targetAudience}

Choose:
1. Heading font (personality, brand)
2. Body font (readability)
3. Font scale (sizes for h1-h6, body, small)

Style: ${style}
- Modern: Clean sans-serif (Inter, Poppins)
- Minimal: Simple sans-serif (Helvetica, Arial)
- Playful: Rounded fonts (Quicksand, Nunito)
- Professional: Serif + Sans (Merriweather + Open Sans)
- Elegant: Serif (Playfair Display, Cormorant)

Output format (JSON):
\`\`\`json
{
  "headingFont": "Poppins, sans-serif",
  "bodyFont": "Inter, sans-serif",
  "scale": ["3rem", "2.5rem", "2rem", "1.5rem", "1.25rem", "1rem", "0.875rem"]
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      return {
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif',
        scale: ['3rem', '2.5rem', '2rem', '1.5rem', '1.25rem', '1rem', '0.875rem'],
      };
    }
  }

  // ============================================
  // Design UI components
  // ============================================
  private async designUIComponents(requirements: any, colors: any): Promise<UIComponent[]> {
    const prompt = `
Design beautiful UI components for this website:

Project: ${requirements.projectName}
Style: ${requirements.style || 'modern'}
Colors: Primary ${colors.primary}, Accent ${colors.accent}

Create components with React + Tailwind CSS:

Essential components:
1. 🔘 Button (primary, secondary, outline, ghost variants)
2. 📝 Input (text, email, password with floating labels)
3. 🎴 Card (content containers)
4. 🔔 Badge (status indicators)
5. 🍔 Navigation (mobile + desktop)
6. 📱 Modal/Dialog
7. ⚠️ Alert (success, error, warning, info)
8. 📊 Progress indicators

For each component provide:
- Name
- Description
- Variants
- States (hover, focus, disabled)
- Accessibility features
- Complete React + Tailwind code

Output format (JSON):
\`\`\`json
{
  "components": [
    {
      "name": "Button",
      "type": "interactive",
      "description": "Primary call-to-action button",
      "variants": ["primary", "secondary", "outline", "ghost"],
      "states": ["default", "hover", "focus", "disabled", "loading"],
      "accessibility": ["aria-label", "keyboard-navigable", "focus-visible"],
      "code": "export const Button = ({ variant = 'primary', children, ...props }) => { ... }"
    }
  ]
}
\`\`\`

Make them beautiful, accessible, and production-ready!
    `;

    try {
      const response = await this.callClaude(prompt);
      const data = this.parseJSON(response);
      return data.components || [];
    } catch (error) {
      console.error('Failed to design UI components');
      return [];
    }
  }

  // ============================================
  // Design pages
  // ============================================
  private async designPages(requirements: any, components: UIComponent[]): Promise<PageDesign[]> {
    const pages: PageDesign[] = [];

    for (const pageName of requirements.pages) {
      const pageDesign = await this.designSinglePage(pageName, requirements, components);
      if (pageDesign) pages.push(pageDesign);
    }

    return pages;
  }

  // ============================================
  // Design single page
  // ============================================
  private async designSinglePage(
    pageName: string,
    requirements: any,
    components: UIComponent[]
  ): Promise<PageDesign | null> {
    const prompt = `
Design the layout and structure for this page:

Page: ${pageName}
Project: ${requirements.projectName}
Style: ${requirements.style || 'modern'}
Target Audience: ${requirements.targetAudience}

Available components:
${components.map((c) => `- ${c.name}: ${c.description}`).join('\n')}

Design the page with sections. Each section should have:
- Name (descriptive)
- Type (hero, features, cta, testimonials, pricing, footer, custom)
- Layout (grid/flex structure)
- Components used
- Description

Create a modern, user-friendly layout that:
1. Follows F-pattern reading (important content top-left)
2. Has clear visual hierarchy
3. Includes white space for breathing room
4. Guides user through flow
5. Has clear CTAs

Output format (JSON):
\`\`\`json
{
  "pageName": "${pageName}",
  "sections": [
    {
      "name": "Hero Section",
      "type": "hero",
      "layout": "flex items-center justify-between",
      "components": ["Heading", "Description", "Button", "Image"],
      "description": "Eye-catching hero with headline, subtext, CTA, and hero image"
    }
  ],
  "mockup": "Text description of visual design",
  "wireframe": "ASCII wireframe of layout"
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error(`Failed to design ${pageName}`);
      return null;
    }
  }

  // ============================================
  // Design responsive strategy
  // ============================================
  private async designResponsive(): Promise<any> {
    return {
      breakpoints: {
        sm: '640px', // Mobile
        md: '768px', // Tablet
        lg: '1024px', // Desktop
        xl: '1280px', // Large Desktop
        '2xl': '1536px', // Extra Large
      },
      strategy: 'Mobile-first with progressive enhancement',
    };
  }

  // ============================================
  // Design animations
  // ============================================
  private async designAnimations(requirements: any): Promise<any> {
    const style = requirements.style || 'modern';

    // Subtle animations for professional, more playful for playful style
    const intensity = style === 'playful' ? 'moderate' : 'subtle';

    return {
      transitions: [
        'Smooth color transitions (200-300ms)',
        'Scale transforms on hover (1.02-1.05)',
        'Fade in/out for modals (150ms)',
        'Slide in for notifications',
      ],
      microInteractions: [
        'Button press effect',
        'Input focus glow',
        'Card hover lift',
        'Loading spinners',
        'Success checkmark animation',
        'Error shake animation',
      ],
    };
  }

  // ============================================
  // Define design principles
  // ============================================
  private defineDesignPrinciples(requirements: any): string[] {
    const principles = [
      '🎯 User-First: Design for user needs and goals',
      '♿ Accessible: WCAG AA compliant, keyboard navigable',
      '📱 Responsive: Mobile-first, works on all devices',
      '⚡ Performance: Fast loading, optimized assets',
      '🎨 Consistent: Design system for unified look',
      '✨ Delightful: Subtle animations and micro-interactions',
      '🔍 Clear Hierarchy: Visual flow guides users',
      '💬 Feedback: Clear states and user feedback',
    ];

    // Add style-specific principles
    const style = requirements.style;
    if (style === 'minimal') {
      principles.push('⚪ White Space: Generous spacing for clarity');
    } else if (style === 'playful') {
      principles.push('🎉 Personality: Fun elements and interactions');
    } else if (style === 'professional') {
      principles.push('💼 Trust: Clean, credible design language');
    }

    return principles;
  }

  // ============================================
  // Call Claude API
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'optimizer',
      prompt,
      undefined,
      this.provider
    );

    return result.response;
  }

  // ============================================
  // Parse JSON from response
  // ============================================
  private parseJSON(response: string): any {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) return {};
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      console.error('Failed to parse JSON');
      return {};
    }
  }

  // ============================================
  // Get default colors
  // ============================================
  private getDefaultColors(style: string): any {
    const colorSchemes: Record<string, any> = {
      modern: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        background: '#ffffff',
        text: '#1f2937',
      },
      minimal: {
        primary: '#000000',
        secondary: '#404040',
        accent: '#2563eb',
        background: '#ffffff',
        text: '#171717',
      },
      playful: {
        primary: '#ec4899',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        background: '#fef3c7',
        text: '#1f2937',
      },
      professional: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#0ea5e9',
        background: '#f8fafc',
        text: '#0f172a',
      },
      dark: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#f59e0b',
        background: '#0f172a',
        text: '#f1f5f9',
      },
      elegant: {
        primary: '#6d28d9',
        secondary: '#a855f7',
        accent: '#fbbf24',
        background: '#fefce8',
        text: '#27272a',
      },
    };

    return colorSchemes[style] || colorSchemes['modern'];
  }
}
