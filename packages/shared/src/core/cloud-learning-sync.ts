// cloud-learning-sync.ts
// ============================================
// ☁️ Cloud Learning Sync - مزامنة المعرفة السحابية
// ============================================

import axios from 'axios';
import { LearningPattern, ErrorAnalysis, Strategy } from './self-learning-system.js';

// ============================================
// Types
// ============================================

export interface CloudPattern extends LearningPattern {
  userId?: string;
  shared: boolean;
  downloads: number;
  upvotes: number;
}

export interface CloudKnowledge {
  patterns: CloudPattern[];
  errors: ErrorAnalysis[];
  strategies: Strategy[];
  metadata: {
    totalUsers: number;
    totalProjects: number;
    lastUpdate: number;
  };
}

export interface SyncOptions {
  apiUrl?: string;
  userId?: string;
  autoSync?: boolean;
  shareMyLearning?: boolean;
}

// ============================================
// Cloud Learning Sync Class
// ============================================

export class CloudLearningSync {
  private apiUrl: string;
  private userId?: string;
  private autoSync: boolean;
  private shareMyLearning: boolean;

  constructor(options: SyncOptions = {}) {
    this.apiUrl =
      options.apiUrl || 'https://aliai-pvm4jazns-al-mohammeds-projects.vercel.app/api/learning';
    this.userId = options.userId;
    this.autoSync = options.autoSync ?? true;
    this.shareMyLearning = options.shareMyLearning ?? true;
  }

  // ============================================
  // 1. Upload Learning (مشاركة ما تعلمته)
  // ============================================
  async uploadPattern(pattern: LearningPattern): Promise<void> {
    if (!this.shareMyLearning) {
      return; // المستخدم لا يريد المشاركة
    }

    try {
      await axios.post(`${this.apiUrl}/patterns`, {
        ...pattern,
        userId: this.userId,
        timestamp: Date.now(),
      });

      console.log(`   ☁️  LearningPattern uploaded to cloud`);
    } catch (error) {
      console.warn('   ⚠️  Failed to upload pattern (offline mode)');
    }
  }

  // ============================================
  // 2. Download Community Knowledge (تحميل معرفة المجتمع)
  // ============================================
  async downloadCommunityKnowledge(task: string): Promise<CloudPattern[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/patterns/search`, {
        params: {
          query: task,
          limit: 10,
        },
      });

      return response.data.patterns || [];
    } catch (error) {
      console.warn('   ⚠️  Failed to download community knowledge (offline mode)');
      return [];
    }
  }

  // ============================================
  // 3. Get Global Statistics (إحصائيات عالمية)
  // ============================================
  async getGlobalStats(): Promise<CloudKnowledge['metadata']> {
    try {
      const response = await axios.get(`${this.apiUrl}/stats`);

      return response.data.metadata;
    } catch (error) {
      return {
        totalUsers: 0,
        totalProjects: 0,
        lastUpdate: Date.now(),
      };
    }
  }

  // ============================================
  // 4. Get Top Patterns (أفضل الأنماط عالمياً)
  // ============================================
  async getTopPatterns(category?: string, limit: number = 10): Promise<CloudPattern[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/patterns/top`, {
        params: {
          category,
          limit,
        },
      });

      return response.data.patterns || [];
    } catch (error) {
      console.warn('   ⚠️  Failed to get top patterns (offline mode)');
      return [];
    }
  }

  // ============================================
  // 5. Upvote LearningPattern (تقييم نمط)
  // ============================================
  async upvotePattern(patternId: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/patterns/${patternId}/upvote`, {
        userId: this.userId,
      });

      console.log('   👍 LearningPattern upvoted');
    } catch (error) {
      console.warn('   ⚠️  Failed to upvote pattern');
    }
  }

  // ============================================
  // 6. Report Error LearningPattern (الإبلاغ عن خطأ شائع)
  // ============================================
  async reportError(error: ErrorAnalysis): Promise<void> {
    if (!this.shareMyLearning) {
      return;
    }

    try {
      await axios.post(`${this.apiUrl}/errors`, {
        ...error,
        userId: this.userId,
        timestamp: Date.now(),
      });

      console.log('   ☁️  Error reported to community');
    } catch (error) {
      console.warn('   ⚠️  Failed to report error (offline mode)');
    }
  }

  // ============================================
  // 7. Get Community Recommendations
  // ============================================
  async getCommunityRecommendations(task: string): Promise<string[]> {
    try {
      const [patterns, stats] = await Promise.all([
        this.downloadCommunityKnowledge(task),
        this.getGlobalStats(),
      ]);

      const recommendations: string[] = [];

      if (stats.totalUsers > 0) {
        recommendations.push(
          `🌍 Community: ${stats.totalUsers} developers, ${stats.totalProjects} projects`
        );
      }

      if (patterns.length > 0) {
        recommendations.push('\n📚 Top community patterns:');

        for (const pattern of patterns.slice(0, 3)) {
          recommendations.push(
            `   • "${pattern.task}" (${pattern.upvotes} 👍, ${pattern.downloads} downloads, score: ${pattern.rating}/100)`
          );
        }
      }

      return recommendations;
    } catch (error) {
      return [];
    }
  }

  // ============================================
  // 8. Full Sync (مزامنة كاملة)
  // ============================================
  async sync(localPatterns: LearningPattern[]): Promise<CloudPattern[]> {
    try {
      console.log('\n☁️  Syncing with cloud...');

      // 1. Upload local patterns
      if (this.shareMyLearning) {
        for (const pattern of localPatterns) {
          await this.uploadPattern(pattern);
        }
        console.log(`   ✅ Uploaded ${localPatterns.length} local patterns`);
      }

      // 2. Download community patterns
      const communityPatterns = await this.getTopPatterns();
      console.log(`   ✅ Downloaded ${communityPatterns.length} community patterns\n`);

      return communityPatterns;
    } catch (error) {
      console.warn('   ⚠️  Sync failed (offline mode)\n');
      return [];
    }
  }

  // ============================================
  // 9. Enable/Disable Sharing
  // ============================================
  enableSharing(): void {
    this.shareMyLearning = true;
    console.log('✅ Learning sharing enabled');
  }

  disableSharing(): void {
    this.shareMyLearning = false;
    console.log('⚠️  Learning sharing disabled (private mode)');
  }

  // ============================================
  // 10. Privacy Settings
  // ============================================
  getPrivacySettings(): {
    shareMyLearning: boolean;
    autoSync: boolean;
    userId?: string;
  } {
    return {
      shareMyLearning: this.shareMyLearning,
      autoSync: this.autoSync,
      userId: this.userId,
    };
  }
}

// ============================================
// Factory
// ============================================

export function createCloudLearningSync(options?: SyncOptions): CloudLearningSync {
  return new CloudLearningSync(options);
}

// ============================================
// Mock API Server Info
// ============================================

export const CLOUD_LEARNING_INFO = `
📡 Cloud Learning Sync

🌍 How it works:
1. Your successful projects (score > 90) are uploaded to community
2. You download best practices from developers worldwide
3. Everyone learns from everyone's experience

🔐 Privacy:
- Only anonymized patterns are shared (no code)
- You control what to share (on/off)
- Your API key is never shared

☁️ API Endpoints:
- POST /learning/patterns          - Upload pattern
- GET  /learning/patterns/search   - Search patterns
- GET  /learning/patterns/top      - Top patterns
- POST /learning/patterns/:id/upvote - Upvote
- POST /learning/errors            - Report error
- GET  /learning/stats             - Global stats

🚀 Commands:
- oqool learn                      - View local stats
- oqool learn --sync               - Sync with cloud
- oqool learn --privacy            - Privacy settings
- oqool learn --top                - Top community patterns

🌟 Benefits:
- Learn from millions of projects worldwide
- Avoid common mistakes others made
- Share your expertise with the community
- Collective intelligence improving together
`;
