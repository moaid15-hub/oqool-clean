export * from './ai-gateway/index.js';
export * from './utils/index.js';
// Core exports (except SecurityIssue to avoid conflict)
export type {
  Architecture,
  Component,
  DatabaseDesign,
  APIDesign,
  FrontendDesign,
  GeneratedCode,
  CodeFile,
  ReviewResult,
  Improvement,
  TestResults,
} from './core/index.js';
export * from './agents/index.js';

// AI & Parser exports
// Temporarily disabled due to missing langchain packages
// export * from './ai/langchain-agent.js';
// Individual exports (may have duplicates with bulk exports below)
// export * from './ai/embeddings-service.js';
export * from './parser/tree-sitter-parser.js';
// export * from './editor/monaco-ai-completion.js'; // Removed - editor folder deleted
// export * from './vector/code-vector-db.js';

// New: Professional Tools
// Commented to avoid duplicates with agents/index.js
// export * from './code-intelligence';
// export * from './ai';
// export * from './integrations';
