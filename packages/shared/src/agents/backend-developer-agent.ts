// backend-developer-agent.ts
// ============================================
// ⚙️ Backend Developer Agent - مطور الخادم
// ============================================

import { UnifiedAIAdapter, type AIProvider } from '../ai-gateway/index.js';

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  authentication: boolean;
  authorization?: string[];
  requestBody?: Record<string, any>;
  responseBody: Record<string, any>;
  statusCodes: Array<{ code: number; description: string }>;
  rateLimit?: string;
}

export interface DatabaseSchema {
  name: string;
  type: 'sql' | 'nosql';
  tables?: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      constraints: string[];
    }>;
    indexes: string[];
    relationships: Array<{
      type: 'one-to-one' | 'one-to-many' | 'many-to-many';
      table: string;
    }>;
  }>;
  collections?: Array<{
    name: string;
    schema: Record<string, any>;
    indexes: string[];
  }>;
}

export interface BackendArchitecture {
  framework: string;
  language: string;
  architecture: 'monolithic' | 'microservices' | 'serverless';
  api: {
    type: 'REST' | 'GraphQL' | 'gRPC';
    endpoints: APIEndpoint[];
    documentation: string;
  };
  database: DatabaseSchema;
  authentication: {
    strategy: 'JWT' | 'OAuth' | 'Session' | 'API-Key';
    implementation: string;
  };
  caching: {
    strategy: 'Redis' | 'Memcached' | 'In-Memory' | 'None';
    layers: string[];
  };
  fileStructure: string;
  middleware: string[];
  errorHandling: string;
  logging: string;
  validation: string;
}

export class BackendDeveloperAgent {
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
    features: string[];
    users?: string[];
    expectedLoad?: 'low' | 'medium' | 'high';
    language?: 'javascript' | 'typescript' | 'python' | 'go' | 'rust';
    database?: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  }): Promise<BackendArchitecture> {
    // 1. Choose tech stack
    const techStack = await this.chooseTechStack(requirements);

    // 2. Design API endpoints
    const api = await this.designAPI(requirements, techStack);

    // 3. Design database schema
    const database = await this.designDatabase(requirements, techStack);

    // 4. Design authentication
    const authentication = await this.designAuthentication(requirements);

    // 5. Choose caching strategy
    const caching = await this.chooseCaching(requirements);

    // 6. Plan middleware
    const middleware = await this.planMiddleware(requirements);

    // 7. Design error handling
    const errorHandling = await this.designErrorHandling(techStack);

    // 8. Design logging
    const logging = await this.designLogging(techStack);

    // 9. Design validation
    const validation = await this.designValidation(techStack);

    // 10. Generate file structure
    const fileStructure = this.generateFileStructure(techStack);

    return {
      framework: techStack.framework,
      language: techStack.language,
      architecture: techStack.architecture,
      api,
      database,
      authentication,
      caching,
      fileStructure,
      middleware,
      errorHandling,
      logging,
      validation,
    };
  }

  // ============================================
  // Choose tech stack
  // ============================================
  private async chooseTechStack(requirements: any): Promise<any> {
    const language = requirements.language || 'typescript';
    const expectedLoad = requirements.expectedLoad || 'medium';

    let framework: string;
    let architecture: 'monolithic' | 'microservices' | 'serverless';

    // Choose framework based on language
    const frameworks: Record<string, string> = {
      javascript: 'Express.js',
      typescript: 'NestJS',
      python: 'FastAPI',
      go: 'Gin',
      rust: 'Actix-web',
    };

    framework = frameworks[language];

    // Choose architecture based on scale
    if (expectedLoad === 'high' || requirements.features.length > 15) {
      architecture = 'microservices';
    } else if (requirements.features.length < 5) {
      architecture = 'serverless';
    } else {
      architecture = 'monolithic';
    }

    return { framework, language, architecture };
  }

  // ============================================
  // Design API
  // ============================================
  private async designAPI(requirements: any, techStack: any): Promise<any> {
    const prompt = `
Design a complete REST API for this backend:

Project: ${requirements.projectName}
Description: ${requirements.description}

Features:
${requirements.features.map((f: string) => `- ${f}`).join('\n')}

Framework: ${techStack.framework}
Language: ${techStack.language}

Design RESTful API endpoints for all features:
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Proper resource naming (plural nouns: /users, /posts)
- Authentication where needed
- Request/Response bodies
- Status codes
- Rate limiting for public endpoints

Output format (JSON):
\`\`\`json
{
  "type": "REST",
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/users",
      "description": "Create new user",
      "authentication": true,
      "authorization": ["admin"],
      "requestBody": {
        "name": "string",
        "email": "string",
        "password": "string"
      },
      "responseBody": {
        "id": "string",
        "name": "string",
        "email": "string",
        "createdAt": "datetime"
      },
      "statusCodes": [
        { "code": 201, "description": "User created" },
        { "code": 400, "description": "Invalid input" },
        { "code": 409, "description": "Email already exists" }
      ],
      "rateLimit": "100 requests per hour"
    }
  ],
  "documentation": "OpenAPI 3.0 spec with Swagger UI"
}
\`\`\`

Design complete CRUD operations for all resources!
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to design API');
      return { type: 'REST', endpoints: [], documentation: 'Swagger' };
    }
  }

  // ============================================
  // Design database
  // ============================================
  private async designDatabase(requirements: any, techStack: any): Promise<DatabaseSchema> {
    const dbType = requirements.database || 'postgresql';
    const isSQL = ['postgresql', 'mysql'].includes(dbType);

    const prompt = `
Design database schema for this project:

Project: ${requirements.projectName}
Features: ${requirements.features.join(', ')}
Database: ${dbType}
Type: ${isSQL ? 'SQL' : 'NoSQL'}

${
  isSQL
    ? `
Design SQL tables with:
1. Proper table names (plural, lowercase)
2. Primary keys (id)
3. Foreign keys (relationships)
4. Indexes for queries
5. Constraints (NOT NULL, UNIQUE, CHECK)
6. Timestamps (createdAt, updatedAt)

Output format (JSON):
\`\`\`json
{
  "name": "${dbType}",
  "type": "sql",
  "tables": [
    {
      "name": "users",
      "columns": [
        { "name": "id", "type": "UUID", "constraints": ["PRIMARY KEY", "DEFAULT gen_random_uuid()"] },
        { "name": "email", "type": "VARCHAR(255)", "constraints": ["UNIQUE", "NOT NULL"] },
        { "name": "password_hash", "type": "VARCHAR(255)", "constraints": ["NOT NULL"] },
        { "name": "created_at", "type": "TIMESTAMP", "constraints": ["DEFAULT CURRENT_TIMESTAMP"] }
      ],
      "indexes": ["CREATE INDEX idx_users_email ON users(email)"],
      "relationships": []
    }
  ]
}
\`\`\`
`
    : `
Design NoSQL collections with:
1. Collection names
2. Document schema
3. Indexes
4. Relationships (references)

Output format (JSON):
\`\`\`json
{
  "name": "${dbType}",
  "type": "nosql",
  "collections": [
    {
      "name": "users",
      "schema": {
        "_id": "ObjectId",
        "email": "string (unique)",
        "passwordHash": "string",
        "profile": {
          "name": "string",
          "avatar": "string"
        },
        "createdAt": "Date",
        "updatedAt": "Date"
      },
      "indexes": ["email"]
    }
  ]
}
\`\`\`
`
}

Design complete schema for all features!
    `;

    try {
      const response = await this.callClaude(prompt);
      return this.parseJSON(response);
    } catch (error) {
      console.error('Failed to design database');
      return {
        name: dbType,
        type: isSQL ? 'sql' : 'nosql',
        tables: [],
        collections: [],
      };
    }
  }

  // ============================================
  // Design authentication
  // ============================================
  private async designAuthentication(requirements: any): Promise<any> {
    const hasUsers =
      requirements.users ||
      requirements.features.some(
        (f: string) => f.toLowerCase().includes('user') || f.toLowerCase().includes('auth')
      );

    if (!hasUsers) {
      return {
        strategy: 'None',
        implementation: 'No authentication required',
      };
    }

    return {
      strategy: 'JWT',
      implementation: `
1. Registration: Hash password with bcrypt
2. Login: Verify credentials, return JWT token
3. Protected routes: Verify JWT middleware
4. Refresh tokens: Long-lived refresh + short-lived access
5. Password reset: Email token flow
      `.trim(),
    };
  }

  // ============================================
  // Choose caching strategy
  // ============================================
  private async chooseCaching(requirements: any): Promise<any> {
    const expectedLoad = requirements.expectedLoad || 'medium';

    if (expectedLoad === 'high') {
      return {
        strategy: 'Redis',
        layers: [
          'API response caching (hot endpoints)',
          'Database query caching',
          'Session storage',
          'Rate limiting',
        ],
      };
    } else if (expectedLoad === 'medium') {
      return {
        strategy: 'In-Memory',
        layers: ['LRU cache for frequent queries', 'Memoization for expensive operations'],
      };
    }

    return {
      strategy: 'None',
      layers: [],
    };
  }

  // ============================================
  // Plan middleware
  // ============================================
  private async planMiddleware(requirements: any): Promise<string[]> {
    const middleware = [
      'CORS - Cross-origin resource sharing',
      'Body Parser - Parse JSON/URL-encoded bodies',
      'Helmet - Security headers',
      'Compression - Gzip responses',
      'Request Logger - Log all requests',
      'Error Handler - Catch and format errors',
    ];

    const hasAuth = requirements.features.some(
      (f: string) => f.toLowerCase().includes('auth') || f.toLowerCase().includes('user')
    );

    if (hasAuth) {
      middleware.push('Authentication - Verify JWT tokens');
      middleware.push('Authorization - Check user permissions');
    }

    middleware.push('Rate Limiter - Prevent abuse');
    middleware.push('Validator - Validate request data');

    return middleware;
  }

  // ============================================
  // Design error handling
  // ============================================
  private async designErrorHandling(techStack: any): Promise<string> {
    return `
Custom error classes:
- ValidationError (400)
- UnauthorizedError (401)
- ForbiddenError (403)
- NotFoundError (404)
- ConflictError (409)
- InternalServerError (500)

Global error handler middleware:
- Catch all errors
- Log errors
- Format error response
- Hide sensitive info in production
- Include request ID for tracking
    `.trim();
  }

  // ============================================
  // Design logging
  // ============================================
  private async designLogging(techStack: any): Promise<string> {
    return `
Logging strategy:
- Winston or Pino logger
- Log levels: error, warn, info, debug
- Structured JSON logs
- Request ID tracking
- Performance metrics
- Error stack traces (dev only)
- Log to console (dev) + file/service (prod)
    `.trim();
  }

  // ============================================
  // Design validation
  // ============================================
  private async designValidation(techStack: any): Promise<string> {
    const validators: Record<string, string> = {
      javascript: 'Joi or Yup',
      typescript: 'Zod or class-validator',
      python: 'Pydantic',
      go: 'go-playground/validator',
      rust: 'validator crate',
    };

    return `
Validation library: ${validators[techStack.language] || 'Joi'}

Validate:
- Request body
- Query parameters
- Route parameters
- Headers (if needed)

Return 400 with detailed errors on validation failure
    `.trim();
  }

  // ============================================
  // Generate file structure
  // ============================================
  private generateFileStructure(techStack: any): string {
    const structures: Record<string, string> = {
      NestJS: `
📁 src/
  📁 modules/
    📁 users/
      📄 users.controller.ts
      📄 users.service.ts
      📄 users.module.ts
      📄 dto/
      📄 entities/
    📁 auth/
    📁 posts/
  📁 common/
    📄 filters/
    📄 guards/
    📄 interceptors/
    📄 pipes/
  📁 config/
  📄 main.ts
  📄 app.module.ts
`,
      'Express.js': `
📁 src/
  📁 routes/
    📄 users.routes.js
    📄 auth.routes.js
  📁 controllers/
    📄 users.controller.js
  📁 services/
    📄 users.service.js
  📁 models/
    📄 user.model.js
  📁 middleware/
    📄 auth.middleware.js
    📄 error.middleware.js
  📁 utils/
  📁 config/
  📄 app.js
  📄 server.js
`,
      FastAPI: `
📁 app/
  📁 api/
    📁 v1/
      📁 endpoints/
        📄 users.py
        📄 auth.py
  📁 core/
    📄 config.py
    📄 security.py
  📁 models/
    📄 user.py
  📁 schemas/
    📄 user.py
  📁 services/
  📁 db/
    📄 session.py
  📄 main.py
`,
    };

    return structures[techStack.framework] || structures['Express.js'];
  }

  // ============================================
  // Call Claude API via UnifiedAIAdapter
  // ============================================
  private async callClaude(prompt: string): Promise<string> {
    const result = await this.aiAdapter.processWithPersonality(
      'coder',
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
