// Core exports - Main features
export * from './god-mode.js';
export * from './version-guardian.js';
export * from './collective-intelligence.js';
export * from './multi-personality-ai-team.js';

// Core Systems (Cache, Context, Validation)
export * from './cache-manager.js';
export * from './context-manager.js';
export * from './validation-pipeline.js';
export * from './validation-pipeline-examples.js';

// Computer Control & System Operations
export * from './operations-executor.js';
export * from './system-monitor.js';

// AI Systems
export * from './ai-code-completion.js';
export * from './ai-response-documentation.js';

// Advanced AI/ML Systems
export * from './ml-pipeline.js';
export * from './computer-vision.js';
export * from './speech-recognition.js';
export * from './text-to-speech.js';
export * from './sentiment-analysis.js';
export * from './recommendation-engine.js';
export * from './anomaly-detector.js';
export * from './predictive-analytics.js';
export * from './nlp-processor.js';
export * from './ai-model-manager.js';

// Analytics & Monitoring
export * from './analytics.js';
export * from './performance-monitor.js';
export * from './progress-tracker.js';

// API & Testing
export * from './api-testing.js'; // ✅ Fixed - APITestCase
export * from './auto-tester.js'; // ✅ Fixed - AutoTestResult
export * from './test-generator.js';
export * from './test-runner.js';

// Authentication & Security
export * from './auth.js';
export {
  EnhancedAuthService,
  authService,
  login as enhancedLogin,
  logout as enhancedLogout,
  getAPIKey as enhancedGetAPIKey,
  type ProviderCredentials,
  type UserSession,
  type StoredCredentials
} from './enhanced-auth.js'; // ✅ New - Enhanced auth with encryption (aliased to avoid conflicts)
export * from './security-enhancements.js'; // ✅ Fixed - SecurityVulnerability

// Request/Response Management (New Systems)
export * from './rate-limiter.js'; // ✅ New - Rate limiting system
export {
  RequestValidator,
  validateOperation,
  BatchValidator,
  DANGEROUS_PATTERNS,
  PROTECTED_PATHS,
  type ValidationResult as RequestValidationResult
} from './request-validator.js'; // ✅ New - Request validation (aliased to avoid conflict)
export * from './response-transformer.js'; // ✅ New - Response transformation

// Code Analysis & Tools
export * from './code-analyzer.js'; // ✅ Fixed - CodeAnalysisPattern
export * from './code-dna-system.js'; // ✅ Fixed - DNACodePattern
export * from './code-executor.js'; // ✅ Fixed - CodeExecutionResult
export * from './code-library.js';
export * from './code-reviewer.js'; // ✅ Fixed - CodeReviewResult
export * from './incremental-analyzer.js';

// CLI & Commands
// export * from './cli.js'; // معطل - CLI تستخدم من packages/cli فقط
// export * from './cli-agent.js'; // معطل - يتعارض مع cli.ts
export * from './cli-new-commands.js';

// Cloud & Collaboration
export * from './cloud-learning-sync.js';
export * from './collaborative-features.js';
export {
  TeamCollaboration,
  type SharedSolution,
  type TeamStats
} from './team-collaboration.js'; // Export specific items to avoid TeamMember conflict
export { TeamMember as CollabTeamMember } from './team-collaboration.js';

// Configuration & Setup
export * from './branding.js';
export * from './config-wizard.js';
export * from './presets.js';

// Database & Integration
export * from './database-integration.js';

// Documentation
export * from './docs-generator.js';

// Executors & Processors
export * from './enhanced-executor.js'; // ✅ Fixed - EnhancedExecutionResult
export * from './parallel-processor.js'; // ✅ Fixed - ParallelTaskResult

// File & Git Management
export * from './file-manager.js'; // ✅ Fixed - FileProjectContext
export * from './file-watcher.js';
export * from './git-helper.js';
export * from './git-manager.js';
export * from './pr-manager.js';

// History & Learning
export * from './history-manager.js';
export * from './self-learning-system.js'; // ✅ Fixed - SelfLearningPattern
export * from './learning-system.js';

// Plugin & Template Systems
export * from './plugin-system.js';
export * from './template-manager.js';

// Tools & Utilities
export * from './tools.js';
// Legacy tools exported with prefix to avoid conflicts
export {
  editFile as editFileOld,
  executeTool as executeToolOld,
  listDirectory as listDirectoryOld,
  readFile as readFileOld,
  searchInFiles as searchInFilesOld,
  writeFile as writeFileOld
} from './tools-old.js';
// Planner exports with alias to avoid Task conflict
export { Task as PlannerTask, type Plan, IntelligentPlanner } from './planner.js';

// UI & Interface
export * from './ui.js';
export * from './voice-first-interface.js';

// API Clients
export * from './api-client.js';
export * from './local-oqool-client.js';
export * from './agent-client.js';
export * from './agent-team.js';

// Planning
// export * from './planner.js'; // Disabled - has TaskResult/Task conflicts
