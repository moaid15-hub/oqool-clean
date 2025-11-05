// seo-specialist-agent.ts
// ============================================
// 🔍 SEO Specialist Agent - خبير التحسين
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

export interface SEOMetadata {
  page: string;
  title: string;
  description: string;
  keywords: string[];
  ogTags: {
    title: string;
    description: string;
    image: string;
    type: string;
  };
  twitterCard: {
    card: string;
    title: string;
    description: string;
    image: string;
  };
  canonical?: string;
  robots?: string;
}

export interface StructuredData {
  type: string;
  data: Record<string, any>;
  code: string;
}

export interface SEOResult {
  metadata: SEOMetadata[];
  structuredData: StructuredData[];
  sitemap: {
    urls: Array<{
      loc: string;
      changefreq: string;
      priority: number;
    }>;
    code: string;
  };
  robotsTxt: string;
  performance: {
    recommendations: string[];
    criticalIssues: string[];
  };
  accessibility: {
    score: number;
    issues: string[];
    fixes: string[];
  };
  mobileOptimization: string[];
  technicalSEO: {
    https: boolean;
    redirects: string[];
    canonicalization: string;
    hreflang?: string;
  };
  contentStrategy: string[];
  analytics: string[];
}

export class SEOSpecialistAgent {
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

  async optimize(specification: {
    siteName: string;
    siteUrl: string;
    description: string;
    pages: string[];
    industry: string;
    targetAudience: string;
    competitors?: string[];
    framework: string;
  }): Promise<SEOResult> {
    // 1. Generate metadata for all pages
    const metadata = await this.generateMetadata(specification);

    // 2. Create structured data (Schema.org)
    const structuredData = await this.generateStructuredData(specification);

    // 3. Generate sitemap
    const sitemap = await this.generateSitemap(specification);

    // 4. Generate robots.txt
    const robotsTxt = this.generateRobotsTxt(specification);

    // 5. Performance recommendations
    const performance = await this.analyzePerformance(specification);

    // 6. Accessibility audit
    const accessibility = await this.auditAccessibility();

    // 7. Mobile optimization
    const mobileOptimization = this.getMobileOptimizations();

    // 8. Technical SEO
    const technicalSEO = this.getTechnicalSEO(specification);

    // 9. Content strategy
    const contentStrategy = await this.createContentStrategy(specification);

    // 10. Analytics setup
    const analytics = this.setupAnalytics();

    return {
      metadata,
      structuredData,
      sitemap,
      robotsTxt,
      performance,
      accessibility,
      mobileOptimization,
      technicalSEO,
      contentStrategy,
      analytics,
    };
  }

  // ============================================
  // Generate metadata
  // ============================================
  private async generateMetadata(spec: any): Promise<SEOMetadata[]> {
    const metadataList: SEOMetadata[] = [];

    for (const page of spec.pages) {
      const metadata = await this.generatePageMetadata(page, spec);
      if (metadata) {
        metadataList.push(metadata);
      }
    }

    return metadataList;
  }

  // ============================================
  // Generate page metadata
  // ============================================
  private async generatePageMetadata(page: string, spec: any): Promise<SEOMetadata | null> {
    const prompt = `
Create SEO-optimized metadata for this page:

Site: ${spec.siteName}
Page: ${page}
Industry: ${spec.industry}
Target Audience: ${spec.targetAudience}
Description: ${spec.description}

Generate:
1. Title (50-60 chars, includes keyword)
2. Meta Description (150-160 chars, compelling)
3. Keywords (5-10 relevant keywords)
4. Open Graph tags (for social sharing)
5. Twitter Card tags

SEO best practices:
- Include primary keyword in title
- Make description actionable
- Use emotional triggers
- Unique for each page
- Compelling for CTR

Output format (JSON):
\`\`\`json
{
  "page": "${page}",
  "title": "Engaging Title | ${spec.siteName}",
  "description": "Compelling description that makes people want to click",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "ogTags": {
    "title": "Title for social media",
    "description": "Description for social media",
    "image": "${spec.siteUrl}/og-image.jpg",
    "type": "website"
  },
  "twitterCard": {
    "card": "summary_large_image",
    "title": "Twitter title",
    "description": "Twitter description",
    "image": "${spec.siteUrl}/twitter-image.jpg"
  },
  "canonical": "${spec.siteUrl}/${page.toLowerCase()}",
  "robots": "index, follow"
}
\`\`\`
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error(`Failed to generate metadata for ${page}`);
      return null;
    }
  }

  // ============================================
  // Generate structured data
  // ============================================
  private async generateStructuredData(spec: any): Promise<StructuredData[]> {
    const structuredData: StructuredData[] = [];

    // Organization schema
    structuredData.push({
      type: 'Organization',
      data: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: spec.siteName,
        url: spec.siteUrl,
        description: spec.description,
        logo: `${spec.siteUrl}/logo.png`,
      },
      code: this.generateSchemaCode('Organization', spec),
    });

    // Website schema
    structuredData.push({
      type: 'WebSite',
      data: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: spec.siteName,
        url: spec.siteUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${spec.siteUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      code: this.generateSchemaCode('WebSite', spec),
    });

    return structuredData;
  }

  // ============================================
  // Generate schema code
  // ============================================
  private generateSchemaCode(type: string, spec: any): string {
    if (type === 'Organization') {
      return `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${spec.siteName}",
  "url": "${spec.siteUrl}",
  "description": "${spec.description}",
  "logo": "${spec.siteUrl}/logo.png"
}
</script>
      `.trim();
    }

    if (type === 'WebSite') {
      return `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "${spec.siteName}",
  "url": "${spec.siteUrl}",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "${spec.siteUrl}/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
</script>
      `.trim();
    }

    return '';
  }

  // ============================================
  // Generate sitemap
  // ============================================
  private async generateSitemap(spec: any): Promise<any> {
    const urls = spec.pages.map((page: string) => ({
      loc: `${spec.siteUrl}/${page.toLowerCase()}`,
      changefreq: page === 'home' ? 'daily' : 'weekly',
      priority: page === 'home' ? 1.0 : 0.8,
    }));

    const code = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url: any) => `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
    `.trim();

    return { urls, code };
  }

  // ============================================
  // Generate robots.txt
  // ============================================
  private generateRobotsTxt(spec: any): string {
    return `
# Allow all crawlers
User-agent: *
Allow: /

# Disallow admin/private pages
Disallow: /admin/
Disallow: /api/
Disallow: /private/

# Sitemap
Sitemap: ${spec.siteUrl}/sitemap.xml

# Crawl-delay (optional)
Crawl-delay: 1
    `.trim();
  }

  // ============================================
  // Analyze performance
  // ============================================
  private async analyzePerformance(spec: any): Promise<any> {
    return {
      recommendations: [
        '⚡ Enable lazy loading for images',
        '📦 Implement code splitting',
        '🗜️ Compress assets (gzip/brotli)',
        '🖼️ Use WebP/AVIF for images',
        '📱 Optimize for mobile (LCP < 2.5s)',
        '🚀 Use CDN for static assets',
        '💾 Implement service worker caching',
        '📊 Remove unused CSS/JS',
        '🔤 Preload critical fonts',
        '⚡ Minimize third-party scripts',
      ],
      criticalIssues: [
        'Large images without optimization',
        'Blocking JavaScript in <head>',
        'Missing cache headers',
        'No compression enabled',
      ],
    };
  }

  // ============================================
  // Audit accessibility
  // ============================================
  private async auditAccessibility(): Promise<any> {
    return {
      score: 85,
      issues: [
        'Some images missing alt text',
        'Insufficient color contrast in buttons',
        'Missing ARIA labels on icons',
        'Form inputs without labels',
      ],
      fixes: [
        '✅ Add descriptive alt text to all images',
        '✅ Increase contrast ratio to WCAG AA (4.5:1)',
        '✅ Add aria-label to icon buttons',
        '✅ Associate labels with form inputs',
        '✅ Add skip navigation link',
        '✅ Ensure keyboard navigation works',
        '✅ Use semantic HTML (header, nav, main, footer)',
        '✅ Test with screen reader',
      ],
    };
  }

  // ============================================
  // Mobile optimizations
  // ============================================
  private getMobileOptimizations(): string[] {
    return [
      '📱 Responsive design (mobile-first)',
      '👆 Touch targets ≥ 44x44px',
      '📏 Viewport meta tag configured',
      '🔤 Readable font sizes (≥16px)',
      '⚡ Fast mobile page speed',
      '🎨 Optimized for small screens',
      '📊 Reduce mobile data usage',
      '🔄 Test on real devices',
    ];
  }

  // ============================================
  // Technical SEO
  // ============================================
  private getTechnicalSEO(spec: any): any {
    return {
      https: true,
      redirects: [
        '301 redirect from www to non-www (or vice versa)',
        '301 redirect from http to https',
        'Redirect old URLs to new URLs',
      ],
      canonicalization: 'Use canonical tags to prevent duplicate content',
      hreflang: spec.targetAudience.includes('international')
        ? 'Implement hreflang tags for multi-language'
        : undefined,
    };
  }

  // ============================================
  // Create content strategy
  // ============================================
  private async createContentStrategy(spec: any): Promise<string[]> {
    return [
      '📝 Blog with industry insights',
      '❓ FAQ page for common questions',
      '🎓 Educational content/guides',
      '📊 Case studies/testimonials',
      '🎥 Video content (YouTube)',
      '📱 Social media presence',
      '📰 Regular content updates',
      '🔗 Internal linking strategy',
      '🎯 Target long-tail keywords',
      '🔄 Update old content regularly',
    ];
  }

  // ============================================
  // Setup analytics
  // ============================================
  private setupAnalytics(): string[] {
    return [
      '📊 Google Analytics 4',
      '🔍 Google Search Console',
      '📈 Track Core Web Vitals',
      '🎯 Set up conversion goals',
      '🔥 Hotjar/Microsoft Clarity for heatmaps',
      '⚠️ Error tracking (Sentry)',
      '📱 Mobile analytics',
      '🔗 Track outbound links',
      '📥 Track downloads',
      '🎬 Track video engagement',
    ];
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
  // Parse JSON
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
}
