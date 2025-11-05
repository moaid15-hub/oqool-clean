// types.ts
// ============================================
// 📋 Shared Types for Arabic Agent
// الأنواع المشتركة لوكيل اللغة العربية
// ============================================

/**
 * Code File Structure - بنية ملف الكود
 */
export interface CodeFile {
  path: string; // مسار الملف
  content: string; // محتوى الكود
  language: string; // لغة البرمجة
  lines: number; // عدد الأسطر
  size?: number; // حجم الملف بالبايت
  encoding?: string; // نوع الترميز (utf-8, ascii, etc)
  lastModified?: Date; // تاريخ آخر تعديل
}

/**
 * Project Architecture - معمارية المشروع
 */
export interface Architecture {
  components: Component[];
  api: APISpecification;
  database: DatabaseSchema;
  frontend: FrontendArchitecture;
  technologies?: TechnologyStack;
  security?: SecurityConfiguration;
  deployment?: DeploymentConfiguration;
}

/**
 * Component Definition - تعريف المكون
 */
export interface Component {
  name: string;
  description: string;
  type: 'backend' | 'frontend' | 'database' | 'service' | 'utility' | 'middleware';
  dependencies: string[];
  responsibilities: string[];
  interfaces?: string[];
}

/**
 * API Specification - مواصفات الواجهة البرمجية
 */
export interface APISpecification {
  endpoints: APIEndpoint[];
  authentication: 'JWT' | 'OAuth2' | 'API_KEY' | 'Basic' | 'None' | string;
  rateLimit?: {
    requests: number;
    period: string;
  };
  versioning?: {
    strategy: 'URL' | 'Header' | 'Query';
    currentVersion: string;
  };
}

/**
 * API Endpoint - نقطة نهاية API
 */
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  auth: boolean;
  requestBody?: object;
  responseBody?: object;
  queryParams?: Parameter[];
  pathParams?: Parameter[];
  headers?: Parameter[];
  statusCodes?: StatusCode[];
}

/**
 * Parameter Definition - تعريف المعامل
 */
export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: any;
  validation?: string;
}

/**
 * Status Code - كود الحالة
 */
export interface StatusCode {
  code: number;
  description: string;
  example?: any;
}

/**
 * Database Schema - مخطط قاعدة البيانات
 */
export interface DatabaseSchema {
  type: 'PostgreSQL' | 'MySQL' | 'MongoDB' | 'SQLite' | 'Redis' | 'Cassandra' | string;
  tables: Table[];
  relationships?: Relationship[];
  indexes?: Index[];
}

/**
 * Table/Collection Definition - تعريف الجدول/المجموعة
 */
export interface Table {
  name: string;
  description?: string;
  fields: Field[];
  primaryKey?: string;
  timestamps?: boolean;
}

/**
 * Field Definition - تعريف الحقل
 */
export interface Field {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  default?: any;
  validation?: string;
  description?: string;
  primary?: boolean;
  foreign?: {
    table: string;
    field: string;
  };
}

/**
 * Relationship Definition - تعريف العلاقة
 */
export interface Relationship {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: {
    table: string;
    field: string;
  };
  to: {
    table: string;
    field: string;
  };
  onDelete?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET_NULL' | 'RESTRICT';
}

/**
 * Index Definition - تعريف الفهرس
 */
export interface Index {
  name: string;
  table: string;
  fields: string[];
  unique?: boolean;
  type?: 'BTREE' | 'HASH' | 'GIN' | 'GIST';
}

/**
 * Frontend Architecture - معمارية الواجهة الأمامية
 */
export interface FrontendArchitecture {
  framework: 'React' | 'Vue' | 'Angular' | 'Svelte' | 'Next.js' | 'Nuxt.js' | string;
  components: string[];
  stateManagement?: 'Redux' | 'MobX' | 'Vuex' | 'Context' | 'Zustand' | 'Pinia' | string;
  routing?: 'React Router' | 'Vue Router' | 'Next.js Router' | string;
  styling?: 'CSS' | 'SCSS' | 'Tailwind' | 'Material-UI' | 'Ant Design' | 'Chakra UI' | string;
  buildTool?: 'Vite' | 'Webpack' | 'Rollup' | 'Parcel' | string;
}

/**
 * Technology Stack - حزمة التقنيات
 */
export interface TechnologyStack {
  backend?: string[];
  frontend?: string[];
  database?: string[];
  caching?: string[];
  messaging?: string[];
  storage?: string[];
  devops?: string[];
  testing?: string[];
  monitoring?: string[];
}

/**
 * Security Configuration - إعدادات الأمان
 */
export interface SecurityConfiguration {
  authentication: {
    method: string;
    provider?: string;
    features: string[];
  };
  authorization: {
    method: 'RBAC' | 'ABAC' | 'ACL' | string;
    roles?: string[];
  };
  encryption: {
    atRest: boolean;
    inTransit: boolean;
    algorithm?: string;
  };
  rateLimit: {
    enabled: boolean;
    requests?: number;
    window?: string;
  };
  cors: {
    enabled: boolean;
    origins?: string[];
  };
}

/**
 * Deployment Configuration - إعدادات النشر
 */
export interface DeploymentConfiguration {
  platform: 'AWS' | 'Azure' | 'GCP' | 'Heroku' | 'Vercel' | 'Netlify' | 'DigitalOcean' | string;
  containerization: 'Docker' | 'Kubernetes' | 'None' | string;
  ci_cd: 'GitHub Actions' | 'GitLab CI' | 'Jenkins' | 'CircleCI' | 'Travis CI' | string;
  environment: ('development' | 'staging' | 'production')[];
  scaling: {
    type: 'horizontal' | 'vertical' | 'auto';
    minInstances?: number;
    maxInstances?: number;
  };
}

/**
 * Test Case - حالة اختبار
 */
export interface TestCase {
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  input: any;
  expectedOutput: any;
  setup?: string;
  teardown?: string;
}

/**
 * Code Review Result - نتيجة مراجعة الكود
 */
export interface CodeReview {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: Suggestion[];
  securityIssues: Issue[];
  performanceIssues: Issue[];
  codeSmells: Issue[];
  summary: string;
}

/**
 * Suggestion - اقتراح
 */
export interface Suggestion {
  type: 'improvement' | 'refactoring' | 'performance' | 'security' | 'readability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  issue: string;
  explanation: string;
  solution: string;
  codeExample?: string;
}

/**
 * Issue - مشكلة
 */
export interface Issue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  location: string;
  fix: string;
  impact?: string;
}

/**
 * Documentation Section - قسم من الوثائق
 */
export interface DocumentationSection {
  title: string;
  content: string;
  codeExamples?: CodeFile[];
  subsections?: DocumentationSection[];
}

/**
 * API Documentation - وثائق API
 */
export interface APIDocumentation {
  title: string;
  version: string;
  description: string;
  baseURL: string;
  authentication: string;
  endpoints: APIEndpoint[];
  examples: {
    endpoint: string;
    request: any;
    response: any;
  }[];
  errors: {
    code: number;
    message: string;
    description: string;
  }[];
}

/**
 * Lesson Structure - بنية الدرس التعليمي
 */
export interface Lesson {
  id: string;
  title: string;
  titleArabic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // بالدقائق
  objectives: string[];
  prerequisites: string[];
  content: string;
  examples: CodeFile[];
  exercises: Exercise[];
  quiz?: Quiz;
  summary: string;
  nextLesson?: string;
}

/**
 * Exercise - تمرين
 */
export interface Exercise {
  id: string;
  question: string;
  hints: string[];
  solution: string;
  difficulty: 'easy' | 'medium' | 'hard';
  testCases?: TestCase[];
}

/**
 * Quiz - اختبار
 */
export interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // بالدقائق
}

/**
 * Quiz Question - سؤال اختبار
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

/**
 * Translation Result - نتيجة الترجمة
 */
export interface TranslationResult {
  originalFiles: CodeFile[];
  translatedFiles: CodeFile[];
  glossary: Map<string, string>;
  notes: string[];
  confidence: number;
}

/**
 * Code Pattern - نمط برمجي
 */
export interface CodePattern {
  name: string;
  description: string;
  category: 'design-pattern' | 'best-practice' | 'anti-pattern' | 'idiom';
  language: string;
  examples: CodeFile[];
  useCases: string[];
  advantages: string[];
  disadvantages?: string[];
  relatedPatterns?: string[];
}

/**
 * Error Analysis - تحليل الخطأ
 */
export interface ErrorAnalysis {
  errorType: 'syntax' | 'runtime' | 'logic' | 'type' | 'network' | 'security';
  errorMessage: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  stackTrace?: string;
  explanation: string;
  solution: string;
  preventionTips: string[];
  relatedConcepts: string[];
}

/**
 * Code Optimization Result - نتيجة تحسين الكود
 */
export interface OptimizationResult {
  originalCode: CodeFile;
  optimizedCode: CodeFile;
  improvements: {
    type: 'time' | 'space' | 'readability' | 'maintainability';
    before: string;
    after: string;
    impact: number; // نسبة التحسين
  }[];
  explanation: string;
  benchmarks?: {
    before: {
      executionTime: number;
      memoryUsage: number;
    };
    after: {
      executionTime: number;
      memoryUsage: number;
    };
  };
}

/**
 * Learning Path - مسار تعليمي
 */
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // بالساعات
  lessons: Lesson[];
  projects: Project[];
  certificate?: boolean;
}

/**
 * Project - مشروع
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  technologies: string[];
  requirements: string[];
  steps: string[];
  resources: string[];
}
