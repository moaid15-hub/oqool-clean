// index.ts
// ============================================
// 🚀 نقطة الدخول الرئيسية
// ============================================

import { runCLI } from './cli.js';

// تشغيل CLI
runCLI();

// تصدير الوحدات للاستخدام البرمجي
// Note: CLI has local versions of these files for its own use
// But we don't re-export them to avoid conflicts with @oqool/shared
// export * from './auth.js'; // Available in @oqool/shared/core
// export * from './file-manager.js'; // CLI uses local version internally
// export * from './ui.js'; // Available in @oqool/shared/core
// export * from './auto-tester.js'; // CLI uses local version internally
// export * from './code-library.js'; // Available in @oqool/shared/core
// export * from './analytics.js'; // Available in @oqool/shared/core

// Re-export from shared package (includes api-client, self-learning-system, and all core features)
export * from '@oqool/shared/core';
// Note: Agents are exported from shared/core already, no need to export again
