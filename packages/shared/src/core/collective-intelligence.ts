// collective-intelligence.ts
// ============================================
// 🧠 Collective Intelligence System
// ============================================

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { OqoolAPIClient } from './api-client.js';

export interface CollectiveDecision {
  id: string;
  topic: string;
  question: string;
  options: DecisionOption[];
  participants: CollectiveParticipant[];
  consensus: DecisionConsensus;
  confidence: number;
  reasoning: string[];
  createdAt: string;
  resolvedAt?: string;
  status: 'open' | 'voting' | 'resolved' | 'implemented';
}

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  votes: number;
  confidence: Map<string, number>; // participantId -> confidence
  pros: string[];
  cons: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface CollectiveParticipant {
  id: string;
  name: string;
  type: 'ai' | 'human' | 'system';
  expertise: string[];
  influence: number; // 0-1
  bias?: string;
  reliability: number; // 0-1
}

export interface DecisionConsensus {
  winner?: string; // optionId
  score: number; // 0-1
  agreement: number; // 0-1
  confidence: number; // 0-1
  reasoning: string[];
}

export interface IntelligenceCluster {
  id: string;
  name: string;
  topic: string;
  participants: CollectiveParticipant[];
  knowledgeBase: KnowledgeEntry[];
  patterns: Pattern[];
  insights: Insight[];
  accuracy: number;
  lastUpdated: string;
}

export interface KnowledgeEntry {
  id: string;
  content: string;
  source: string;
  confidence: number;
  tags: string[];
  timestamp: string;
  validated: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  occurrences: number;
  examples: string[];
  implications: string[];
}

export interface Insight {
  id: string;
  type: 'trend' | 'correlation' | 'anomaly' | 'prediction' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface SwarmIntelligence {
  id: string;
  topic: string;
  agents: SwarmAgent[];
  communication: CommunicationNetwork;
  decisions: CollectiveDecision[];
  performance: SwarmPerformance;
  evolution: EvolutionMetrics;
}

export interface SwarmAgent {
  id: string;
  name: string;
  role: string;
  expertise: string[];
  learningRate: number;
  adaptability: number;
  communication: number;
  decisionQuality: number;
}

export interface CommunicationNetwork {
  nodes: Map<string, CommunicationNode>;
  connections: Map<string, number>; // strength 0-1
  efficiency: number;
}

export interface CommunicationNode {
  agentId: string;
  connections: string[];
  influence: number;
  centrality: number;
}

export interface SwarmPerformance {
  accuracy: number;
  speed: number;
  collaboration: number;
  innovation: number;
  reliability: number;
}

export interface EvolutionMetrics {
  generations: number;
  improvements: number;
  adaptations: number;
  survivalRate: number;
}

export class CollectiveIntelligenceSystem {
  private apiClient: OqoolAPIClient;
  private workingDir: string;
  private decisionsPath: string;
  private clustersPath: string;
  private swarmPath: string;

  constructor(apiClient: OqoolAPIClient, workingDir: string = process.cwd()) {
    this.apiClient = apiClient;
    this.workingDir = workingDir;
    this.decisionsPath = path.join(workingDir, '.oqool', 'collective-decisions');
    this.clustersPath = path.join(workingDir, '.oqool', 'intelligence-clusters');
    this.swarmPath = path.join(workingDir, '.oqool', 'swarm-intelligence');
    this.initializeSystem();
  }

  /**
   * تهيئة النظام
   */
  private async initializeSystem(): Promise<void> {
    await fs.ensureDir(this.decisionsPath);
    await fs.ensureDir(this.clustersPath);
    await fs.ensureDir(this.swarmPath);
  }

  /**
   * إنشاء قرار جماعي
   */
  async createCollectiveDecision(
    topic: string,
    question: string,
    options: Array<{ title: string; description: string; pros: string[]; cons: string[] }>
  ): Promise<CollectiveDecision> {
    const spinner = ora('إنشاء قرار جماعي...').start();

    try {
      // إنشاء الخيارات
      const decisionOptions: DecisionOption[] = options.map((option, index) => ({
        id: this.generateId(),
        title: option.title,
        description: option.description,
        votes: 0,
        confidence: new Map(),
        pros: option.pros,
        cons: option.cons,
        impact: this.assessImpact(option.title, option.description),
        complexity: this.assessComplexity(option.description),
      }));

      // إنشاء المشاركين
      const participants: CollectiveParticipant[] = [
        {
          id: 'architect-ai',
          name: 'AI المعماري',
          type: 'ai',
          expertise: ['architecture', 'design', 'scalability'],
          influence: 0.8,
          reliability: 0.9,
        },
        {
          id: 'security-ai',
          name: 'AI الأمني',
          type: 'ai',
          expertise: ['security', 'vulnerabilities', 'best-practices'],
          influence: 0.9,
          reliability: 0.95,
        },
        {
          id: 'performance-ai',
          name: 'AI الأداء',
          type: 'ai',
          expertise: ['optimization', 'performance', 'efficiency'],
          influence: 0.7,
          reliability: 0.85,
        },
        {
          id: 'user-experience',
          name: 'AI تجربة المستخدم',
          type: 'ai',
          expertise: ['ux', 'usability', 'accessibility'],
          influence: 0.6,
          reliability: 0.8,
        },
        {
          id: 'human-developer',
          name: 'المطور البشري',
          type: 'human',
          expertise: ['practical', 'contextual', 'business'],
          influence: 0.5,
          reliability: 0.75,
        },
      ];

      const decision: CollectiveDecision = {
        id: this.generateId(),
        topic,
        question,
        options: decisionOptions,
        participants,
        consensus: {
          score: 0,
          agreement: 0,
          confidence: 0,
          reasoning: [],
        },
        confidence: 0,
        reasoning: [],
        createdAt: new Date().toISOString(),
        status: 'open',
      };

      await this.saveDecision(decision);

      spinner.succeed('تم إنشاء القرار الجماعي!');
      console.log(chalk.green(`\n🧠 موضوع: ${topic}`));
      console.log(chalk.white(`   السؤال: ${question}`));
      console.log(chalk.cyan(`   الخيارات: ${options.length}`));
      console.log(chalk.cyan(`   المشاركون: ${participants.length}`));
      console.log(chalk.gray(`   المعرف: ${decision.id}\n`));

      return decision;
    } catch (error) {
      spinner.fail('فشل في إنشاء القرار الجماعي');
      throw error;
    }
  }

  /**
   * جمع الآراء الجماعية
   */
  async collectOpinions(decisionId: string): Promise<CollectiveDecision> {
    const spinner = ora('جمع الآراء...').start();

    try {
      const decision = await this.getDecision(decisionId);
      if (!decision) {
        throw new Error('القرار غير موجود');
      }

      decision.status = 'voting';

      // جمع آراء كل مشارك
      for (const participant of decision.participants) {
        if (participant.type === 'ai') {
          await this.getAIOpinion(decision, participant);
        } else {
          // محاكاة رأي المطور البشري
          await this.getHumanOpinion(decision, participant);
        }
      }

      // تحليل النتائج
      await this.analyzeResults(decision);

      decision.status = 'resolved';
      decision.resolvedAt = new Date().toISOString();

      await this.saveDecision(decision);

      spinner.succeed('تم جمع وتحليل الآراء!');
      this.displayDecisionResults(decision);

      return decision;
    } catch (error) {
      spinner.fail('فشل في جمع الآراء');
      throw error;
    }
  }

  /**
   * الحصول على رأي AI
   */
  private async getAIOpinion(
    decision: CollectiveDecision,
    participant: CollectiveParticipant
  ): Promise<void> {
    const prompt = this.buildDecisionPrompt(decision, participant);

    const messages = [
      {
        role: 'system' as const,
        content: `أنت ${participant.name}, خبير في ${participant.expertise.join(', ')}.

${prompt}

قيم كل خيار من 0-10 وقدم أسباب منطقية ومفصلة.
ركز على مجال خبرتك وكن موضوعياً في تقييمك.`,
      },
      {
        role: 'user' as const,
        content: decision.question,
      },
    ];

    const response = await this.apiClient.sendChatMessage(messages);

    if (response.success) {
      await this.parseAIOpinion(decision, participant, response.message);
    }
  }

  /**
   * تحليل النتائج
   */
  private async analyzeResults(decision: CollectiveDecision): Promise<void> {
    let totalScore = 0;
    let totalAgreement = 0;
    let totalConfidence = 0;
    const reasoning: string[] = [];

    // تحليل كل خيار
    for (const option of decision.options) {
      let optionScore = 0;
      let optionAgreement = 0;
      const optionReasoning: string[] = [];

      // جمع الآراء للخيار
      for (const participant of decision.participants) {
        const confidence = option.confidence.get(participant.id) || 0;
        optionScore += confidence * participant.influence;
        optionAgreement += confidence;
        totalConfidence += confidence;
      }

      optionScore /= decision.participants.length;
      optionAgreement /= decision.participants.length;

      totalScore += optionScore;
      totalAgreement += optionAgreement;
    }

    // تحديد الخيار الفائز
    const winner = decision.options.reduce((best, current) =>
      this.calculateOptionScore(current, decision.participants) >
      this.calculateOptionScore(best, decision.participants)
        ? current
        : best
    );

    // بناء التوافق
    const consensusScore = this.calculateConsensus(decision.options);
    const agreementScore =
      totalAgreement / (decision.options.length * decision.participants.length);
    const confidenceScore =
      totalConfidence / (decision.options.length * decision.participants.length);

    decision.consensus = {
      winner: winner.id,
      score: consensusScore,
      agreement: agreementScore,
      confidence: confidenceScore,
      reasoning,
    };

    decision.confidence = confidenceScore;
  }

  /**
   * حساب درجة الخيار
   */
  private calculateOptionScore(
    option: DecisionOption,
    participants: CollectiveParticipant[]
  ): number {
    let score = 0;

    for (const participant of participants) {
      const confidence = option.confidence.get(participant.id) || 0;
      score += confidence * participant.influence;
    }

    return score / participants.length;
  }

  /**
   * حساب درجة التوافق
   */
  private calculateConsensus(options: DecisionOption[]): number {
    if (options.length < 2) return 1;

    const scores = options.map((option) => {
      const participants = Array.from(option.confidence.keys()).map((id) => ({
        id,
        name: '',
        type: 'ai' as const,
        expertise: [],
        influence: 0.5,
        reliability: 0.5,
      }));
      return this.calculateOptionScore(
        option,
        participants.filter((p) => option.confidence.has(p.id))
      );
    });

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore;

    return range === 0 ? 1 : 1 - range / maxScore;
  }

  /**
   * بناء prompt للقرار
   */
  private buildDecisionPrompt(
    decision: CollectiveDecision,
    participant: CollectiveParticipant
  ): string {
    let prompt = `الموضوع: ${decision.topic}\n`;
    prompt += `السؤال: ${decision.question}\n\n`;

    prompt += `الخيارات المتاحة:\n`;
    for (let i = 0; i < decision.options.length; i++) {
      const option = decision.options[i];
      prompt += `${i + 1}. ${option.title}\n`;
      prompt += `   ${option.description}\n`;
      prompt += `   المميزات: ${option.pros.join(', ')}\n`;
      prompt += `   العيوب: ${option.cons.join(', ')}\n\n`;
    }

    prompt += `خبرتك الرئيسية: ${participant.expertise.join(', ')}\n`;
    prompt += `مستوى تأثيرك: ${participant.influence}\n\n`;

    prompt += `قيم كل خيار من 0-10 مع الأسباب التالية:\n`;
    prompt += `- التوافق مع خبرتك\n`;
    prompt += `- التأثير المتوقع\n`;
    prompt += `- المخاطر المحتملة\n`;
    prompt += `- الجدوى التنفيذية\n\n`;

    return prompt;
  }

  /**
   * تحليل رأي AI
   */
  private async parseAIOpinion(
    decision: CollectiveDecision,
    participant: CollectiveParticipant,
    response: string
  ): Promise<void> {
    // استخراج التقييمات من الرد
    const evaluations = this.extractEvaluations(response);

    for (let i = 0; i < decision.options.length; i++) {
      const option = decision.options[i];
      const evaluation = evaluations[i];

      if (evaluation) {
        const score = Math.min(10, Math.max(0, evaluation.score));
        option.confidence.set(participant.id, score / 10);

        if (evaluation.reasoning) {
          // إضافة السبب إلى قائمة الأسباب
          decision.reasoning.push(`${participant.name} (${option.title}): ${evaluation.reasoning}`);
        }
      }
    }
  }

  /**
   * استخراج التقييمات من الرد
   */
  private extractEvaluations(response: string): Array<{ score: number; reasoning: string }> {
    const evaluations: Array<{ score: number; reasoning: string }> = [];
    const lines = response.split('\n');

    let currentOption = 0;

    for (const line of lines) {
      // البحث عن أرقام التقييم
      const scoreMatch = line.match(/(\d+)(?:\/10)?/);
      if (scoreMatch) {
        const score = parseInt(scoreMatch[1]);

        // استخراج السبب من السطر نفسه أو التالي
        let reasoning = line.replace(/\d+\/10/, '').trim();
        if (!reasoning) {
          reasoning = 'تقييم بناءً على الخبرة التقنية';
        }

        evaluations.push({ score, reasoning });

        if (evaluations.length >= 3) break; // نأخذ أول 3 تقييمات
      }
    }

    return evaluations;
  }

  /**
   * الحصول على رأي المطور البشري
   */
  private async getHumanOpinion(
    decision: CollectiveDecision,
    participant: CollectiveParticipant
  ): Promise<void> {
    console.log(chalk.cyan(`\n👤 رأي ${participant.name} في: ${decision.topic}`));

    for (let i = 0; i < decision.options.length; i++) {
      const option = decision.options[i];

      console.log(chalk.white(`\n${i + 1}. ${option.title}`));
      console.log(chalk.gray(`   ${option.description}`));

      const { rating, reasoning } = await inquirer.prompt([
        {
          type: 'number',
          name: 'rating',
          message: 'تقييمك (0-10):',
          min: 0,
          max: 10,
          default: 5,
        },
        {
          type: 'input',
          name: 'reasoning',
          message: 'الأسباب:',
        },
      ]);

      option.confidence.set(participant.id, rating / 10);

      if (reasoning) {
        decision.reasoning.push(`${participant.name} (${option.title}): ${reasoning}`);
      }
    }
  }

  /**
   * عرض نتائج القرار
   */
  private displayDecisionResults(decision: CollectiveDecision): void {
    console.log(chalk.green('\n📊 نتائج القرار الجماعي:\n'));

    console.log(chalk.white(`🎯 الموضوع: ${decision.topic}`));
    console.log(chalk.white(`❓ السؤال: ${decision.question}`));
    console.log(
      chalk.white(`📈 درجة التوافق: ${(decision.consensus.agreement * 100).toFixed(1)}%`)
    );
    console.log(chalk.white(`🎖️ درجة الثقة: ${(decision.consensus.confidence * 100).toFixed(1)}%`));

    if (decision.consensus.winner) {
      const winner = decision.options.find((o) => o.id === decision.consensus.winner);
      if (winner) {
        console.log(chalk.green(`🏆 الخيار الموصى به: ${winner.title}`));
        console.log(chalk.white(`   ${winner.description}`));
      }
    }

    console.log(chalk.cyan('\n📋 تفاصيل الخيارات:'));
    for (const option of decision.options) {
      const score = this.calculateOptionScore(option, decision.participants);
      const scoreBar = '█'.repeat(Math.floor(score * 10)) + '░'.repeat(10 - Math.floor(score * 10));

      console.log(chalk.white(`\n   ${option.title}: ${scoreBar} ${(score * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   ${option.description}`));

      if (option.pros.length > 0) {
        console.log(chalk.green(`   ✓ ${option.pros.join(' | ')}`));
      }

      if (option.cons.length > 0) {
        console.log(chalk.red(`   ✗ ${option.cons.join(' | ')}`));
      }
    }

    console.log(chalk.yellow('\n💭 الأسباب والتحليلات:'));
    for (const reason of decision.reasoning.slice(0, 5)) {
      console.log(chalk.gray(`   • ${reason}`));
    }

    if (decision.reasoning.length > 5) {
      console.log(chalk.gray(`   ... و ${decision.reasoning.length - 5} أسباب أخرى`));
    }
  }

  /**
   * إنشاء مجموعة ذكاء
   */
  async createIntelligenceCluster(
    name: string,
    topic: string,
    participants: CollectiveParticipant[]
  ): Promise<IntelligenceCluster> {
    const spinner = ora('إنشاء مجموعة الذكاء...').start();

    try {
      const cluster: IntelligenceCluster = {
        id: this.generateId(),
        name,
        topic,
        participants,
        knowledgeBase: [],
        patterns: [],
        insights: [],
        accuracy: 0.5,
        lastUpdated: new Date().toISOString(),
      };

      await this.saveCluster(cluster);

      spinner.succeed('تم إنشاء مجموعة الذكاء!');
      console.log(chalk.green(`\n🧠 مجموعة: ${name}`));
      console.log(chalk.cyan(`   الموضوع: ${topic}`));
      console.log(chalk.cyan(`   المشاركون: ${participants.length}`));
      console.log(chalk.gray(`   المعرف: ${cluster.id}\n`));

      return cluster;
    } catch (error) {
      spinner.fail('فشل في إنشاء مجموعة الذكاء');
      throw error;
    }
  }

  /**
   * إضافة معرفة للمجموعة
   */
  async addKnowledge(
    clusterId: string,
    content: string,
    source: string,
    tags: string[] = []
  ): Promise<void> {
    const cluster = await this.getCluster(clusterId);
    if (!cluster) {
      throw new Error('المجموعة غير موجودة');
    }

    const knowledge: KnowledgeEntry = {
      id: this.generateId(),
      content,
      source,
      confidence: 0.8,
      tags,
      timestamp: new Date().toISOString(),
      validated: false,
    };

    cluster.knowledgeBase.push(knowledge);
    cluster.lastUpdated = new Date().toISOString();

    await this.saveCluster(cluster);
    await this.updateClusterInsights(cluster);

    console.log(chalk.green('✅ تم إضافة المعرفة للمجموعة'));
  }

  /**
   * تحديث رؤى المجموعة
   */
  private async updateClusterInsights(cluster: IntelligenceCluster): Promise<void> {
    // تحليل المعرفة لاستخراج الأنماط
    const patterns = await this.extractPatterns(cluster.knowledgeBase);
    cluster.patterns = patterns;

    // توليد الرؤى
    const insights = await this.generateInsights(cluster);
    cluster.insights = insights;

    // تحديث الدقة
    cluster.accuracy = this.calculateAccuracy(cluster);

    await this.saveCluster(cluster);
  }

  /**
   * استخراج الأنماط
   */
  private async extractPatterns(knowledgeBase: KnowledgeEntry[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const tagCounts = new Map<string, number>();
    const contentPatterns = new Map<string, { count: number; examples: string[] }>();

    // تحليل العلامات
    for (const knowledge of knowledgeBase) {
      for (const tag of knowledge.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // إنشاء أنماط من العلامات الشائعة
    for (const [tag, count] of tagCounts.entries()) {
      if (count >= 2) {
        const examples = knowledgeBase
          .filter((k) => k.tags.includes(tag))
          .map((k) => k.content.substring(0, 100));

        patterns.push({
          id: this.generateId(),
          name: `نمط ${tag}`,
          description: `نمط متكرر في ${tag}`,
          confidence: Math.min(1.0, count / knowledgeBase.length),
          occurrences: count,
          examples,
          implications: [`يظهر أهمية ${tag} في الموضوع`],
        });
      }
    }

    return patterns;
  }

  /**
   * توليد الرؤى
   */
  private async generateInsights(cluster: IntelligenceCluster): Promise<Insight[]> {
    const insights: Insight[] = [];

    // رؤية حول الأنماط
    if (cluster.patterns.length > 0) {
      insights.push({
        id: this.generateId(),
        type: 'trend',
        title: 'الأنماط المكتشفة',
        description: `تم اكتشاف ${cluster.patterns.length} نمط رئيسي`,
        confidence: 0.8,
        impact: 'medium',
        actionItems: [
          'مراجعة الأنماط المكتشفة',
          'تطبيق الدروس المستفادة',
          'تعزيز المجالات الإيجابية',
        ],
      });
    }

    // رؤية حول الدقة
    insights.push({
      id: this.generateId(),
      type: 'optimization',
      title: 'تحسين الدقة',
      description: `دقة المجموعة الحالية: ${(cluster.accuracy * 100).toFixed(1)}%`,
      confidence: 0.9,
      impact: cluster.accuracy < 0.7 ? 'high' : 'low',
      actionItems: [
        'إضافة المزيد من المعرفة المتنوعة',
        'التحقق من صحة المعلومات',
        'تحسين عملية التعلم',
      ],
    });

    return insights;
  }

  /**
   * حساب الدقة
   */
  private calculateAccuracy(cluster: IntelligenceCluster): number {
    let accuracy = 0.5;

    // زيادة الدقة مع عدد المعارف
    accuracy += Math.min(0.3, cluster.knowledgeBase.length / 10);

    // زيادة الدقة مع تنوع المصادر
    const sources = new Set(cluster.knowledgeBase.map((k) => k.source));
    accuracy += Math.min(0.2, sources.size / 5);

    return Math.min(1.0, accuracy);
  }

  /**
   * تقييم التأثير
   */
  private assessImpact(title: string, description: string): DecisionOption['impact'] {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('حرج') || text.includes('أمان') || text.includes('نظام')) {
      return 'critical';
    } else if (text.includes('مهم') || text.includes('رئيسي') || text.includes('أساسي')) {
      return 'high';
    } else if (text.includes('مفيد') || text.includes('محسن') || text.includes('أفضل')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * تقييم التعقيد
   */
  private assessComplexity(description: string): DecisionOption['complexity'] {
    const wordCount = description.split(' ').length;

    if (wordCount > 50) {
      return 'complex';
    } else if (wordCount > 20) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  /**
   * الحصول على قرار
   */
  private async getDecision(decisionId: string): Promise<CollectiveDecision | null> {
    const decisionPath = path.join(this.decisionsPath, `${decisionId}.json`);

    if (await fs.pathExists(decisionPath)) {
      return await fs.readJson(decisionPath);
    }

    return null;
  }

  /**
   * حفظ قرار
   */
  private async saveDecision(decision: CollectiveDecision): Promise<void> {
    const decisionPath = path.join(this.decisionsPath, `${decision.id}.json`);
    await fs.writeJson(decisionPath, decision, { spaces: 2 });
  }

  /**
   * الحصول على مجموعة
   */
  private async getCluster(clusterId: string): Promise<IntelligenceCluster | null> {
    const clusterPath = path.join(this.clustersPath, `${clusterId}.json`);

    if (await fs.pathExists(clusterPath)) {
      return await fs.readJson(clusterPath);
    }

    return null;
  }

  /**
   * حفظ مجموعة
   */
  private async saveCluster(cluster: IntelligenceCluster): Promise<void> {
    const clusterPath = path.join(this.clustersPath, `${cluster.id}.json`);
    await fs.writeJson(clusterPath, cluster, { spaces: 2 });
  }

  /**
   * توليد معرف فريد
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * عرض جميع القرارات
   */
  async listDecisions(): Promise<void> {
    const files = await fs.readdir(this.decisionsPath);
    const decisions: CollectiveDecision[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const decisionPath = path.join(this.decisionsPath, file);
        const decision = await fs.readJson(decisionPath);
        decisions.push(decision);
      }
    }

    if (decisions.length === 0) {
      console.log(chalk.yellow('❌ لا توجد قرارات جماعية'));
      console.log(chalk.cyan('💡 أنشئ قراراً جديداً: oqool-code collective create'));
      return;
    }

    console.log(chalk.green('\n🧠 القرارات الجماعية:\n'));

    decisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    for (const decision of decisions) {
      const status =
        decision.status === 'resolved' ? chalk.green('✓ محلول') : chalk.yellow('⏳ مفتوح');
      const confidence = decision.consensus.confidence * 100;

      console.log(chalk.cyan(`📋 ${decision.topic}`));
      console.log(chalk.white(`   ${decision.question}`));
      console.log(chalk.gray(`   الحالة: ${status} | الثقة: ${confidence.toFixed(1)}%`));
      console.log(chalk.gray(`   تاريخ: ${new Date(decision.createdAt).toLocaleString('ar')}`));
      console.log('');
    }
  }

  /**
   * الحصول على جميع القرارات
   */
  async getAllDecisions(): Promise<CollectiveDecision[]> {
    const files = await fs.readdir(this.decisionsPath);
    const decisions: CollectiveDecision[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const decisionPath = path.join(this.decisionsPath, file);
        const decision = await fs.readJson(decisionPath);
        decisions.push(decision);
      }
    }

    return decisions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * عرض المجموعات الذكية
   */
  async listClusters(): Promise<void> {
    const files = await fs.readdir(this.clustersPath);
    const clusters: IntelligenceCluster[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const clusterPath = path.join(this.clustersPath, file);
        const cluster = await fs.readJson(clusterPath);
        clusters.push(cluster);
      }
    }

    if (clusters.length === 0) {
      console.log(chalk.yellow('❌ لا توجد مجموعات ذكاء'));
      console.log(chalk.cyan('💡 أنشئ مجموعة جديدة: oqool-code cluster create'));
      return;
    }

    console.log(chalk.green('\n🧠 مجموعات الذكاء:\n'));

    clusters.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

    for (const cluster of clusters) {
      console.log(chalk.cyan(`📚 ${cluster.name}`));
      console.log(chalk.white(`   ${cluster.topic}`));
      console.log(
        chalk.gray(
          `   المعرفة: ${cluster.knowledgeBase.length} | الأنماط: ${cluster.patterns.length} | الدقة: ${(cluster.accuracy * 100).toFixed(1)}%`
        )
      );
      console.log(
        chalk.gray(`   آخر تحديث: ${new Date(cluster.lastUpdated).toLocaleString('ar')}`)
      );
      console.log('');
    }
  }

  /**
   * الحصول على جميع المجموعات
   */
  async getAllClusters(): Promise<IntelligenceCluster[]> {
    const files = await fs.readdir(this.clustersPath);
    const clusters: IntelligenceCluster[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const clusterPath = path.join(this.clustersPath, file);
        const cluster = await fs.readJson(clusterPath);
        clusters.push(cluster);
      }
    }

    return clusters.sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  }
}

// مصنع لإنشاء instance
export function createCollectiveIntelligenceSystem(
  apiClient: OqoolAPIClient,
  workingDir?: string
): CollectiveIntelligenceSystem {
  return new CollectiveIntelligenceSystem(apiClient, workingDir);
}
