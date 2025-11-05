/**
 * Intent Parser Tests
 *
 * اختبارات شاملة لنظام تحليل النوايا
 */

import { intentParser, parseIntent } from './intent-parser.js';

/**
 * Test cases for intent parsing
 */
const testCases = [
  // Generate intent
  {
    message: 'create a new React component',
    expectedIntent: 'generate',
    expectedEntities: { frameworks: ['react'] },
  },
  {
    message: 'أنشئ ملف جديد لمصادقة المستخدم',
    expectedIntent: 'generate',
    expectedLanguage: 'ar',
  },
  {
    message: 'generate API endpoint for user login',
    expectedIntent: 'generate',
  },

  // Modify intent
  {
    message: 'update the authentication logic in auth.ts',
    expectedIntent: 'modify',
    expectedEntities: { files: ['auth.ts'] },
  },
  {
    message: 'عدّل الكود في index.js',
    expectedIntent: 'modify',
    expectedLanguage: 'ar',
  },
  {
    message: 'refactor the user service',
    expectedIntent: 'modify',
  },

  // Explain intent
  {
    message: 'explain how authentication works',
    expectedIntent: 'explain',
  },
  {
    message: 'what is this function doing?',
    expectedIntent: 'explain',
  },
  {
    message: 'اشرح لي كيف يعمل هذا الكود',
    expectedIntent: 'explain',
    expectedLanguage: 'ar',
  },

  // Review intent
  {
    message: 'review my code changes',
    expectedIntent: 'review',
  },
  {
    message: 'check the security of this API',
    expectedIntent: 'review',
  },
  {
    message: 'راجع الكود قبل الرفع',
    expectedIntent: 'review',
    expectedLanguage: 'ar',
  },

  // Debug intent
  {
    message: 'fix the error in login function',
    expectedIntent: 'debug',
  },
  {
    message: 'there is a bug in the payment system',
    expectedIntent: 'debug',
  },
  {
    message: 'صحح الخطأ في النظام',
    expectedIntent: 'debug',
    expectedLanguage: 'ar',
  },

  // Optimize intent
  {
    message: 'optimize the database queries',
    expectedIntent: 'optimize',
  },
  {
    message: 'make this code faster',
    expectedIntent: 'optimize',
  },

  // Test intent
  {
    message: 'run the unit tests',
    expectedIntent: 'test',
  },
  {
    message: 'create integration tests',
    expectedIntent: 'test',
  },
  {
    message: 'اختبر النظام',
    expectedIntent: 'test',
    expectedLanguage: 'ar',
  },

  // Git intent
  {
    message: 'git commit -m "add feature"',
    expectedIntent: 'git',
  },
  {
    message: 'push changes to github',
    expectedIntent: 'git',
  },
  {
    message: 'create a new branch',
    expectedIntent: 'git',
  },

  // File intent
  {
    message: 'read the config.json file',
    expectedIntent: 'file',
    expectedEntities: { files: ['config.json'] },
  },
  {
    message: 'delete old logs',
    expectedIntent: 'file',
  },

  // Search intent
  {
    message: 'find all TODO comments',
    expectedIntent: 'search',
  },
  {
    message: 'where is the user model defined?',
    expectedIntent: 'search',
  },
  {
    message: 'ابحث عن الدالة',
    expectedIntent: 'search',
    expectedLanguage: 'ar',
  },

  // Chat intent
  {
    message: 'hello there',
    expectedIntent: 'chat',
  },
  {
    message: 'thanks for the help',
    expectedIntent: 'chat',
  },
];

/**
 * Run tests
 */
export function runIntentParserTests(): void {
  console.log('🧪 Running Intent Parser Tests...\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = parseIntent(testCase.message);

    // Check intent type
    if (result.type === testCase.expectedIntent) {
      console.log(`✅ PASS: "${testCase.message}"`);
      console.log(`   Intent: ${result.type} (confidence: ${result.confidence.toFixed(2)})`);

      // Check language if specified
      if (testCase.expectedLanguage && result.language !== testCase.expectedLanguage) {
        console.log(`   ⚠️  Language mismatch: expected ${testCase.expectedLanguage}, got ${result.language}`);
      }

      // Check entities if specified
      if (testCase.expectedEntities) {
        for (const [key, value] of Object.entries(testCase.expectedEntities)) {
          const entityValue = (result.entities as any)[key];
          if (JSON.stringify(entityValue) === JSON.stringify(value)) {
            console.log(`   ✓ Entity ${key}: ${JSON.stringify(value)}`);
          } else {
            console.log(`   ⚠️  Entity mismatch for ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(entityValue)}`);
          }
        }
      }

      // Show sub-intent if present
      if (result.subIntent) {
        console.log(`   Sub-intent: ${result.subIntent}`);
      }

      // Show suggestions
      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`   Suggestions: ${result.suggestions.slice(0, 2).join(', ')}`);
      }

      passed++;
    } else {
      console.log(`❌ FAIL: "${testCase.message}"`);
      console.log(`   Expected: ${testCase.expectedIntent}`);
      console.log(`   Got: ${result.type} (confidence: ${result.confidence.toFixed(2)})`);
      failed++;
    }

    console.log();
  }

  // Summary
  console.log('═'.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failed}/${testCases.length}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / testCases.length) * 100)}%\n`);
}

/**
 * Test entity extraction
 */
export function testEntityExtraction(): void {
  console.log('🧪 Testing Entity Extraction...\n');

  const entityTests = [
    {
      message: 'create a new file src/auth/login.ts with TypeScript',
      expectedFiles: ['src/auth/login.ts'],
      expectedLanguages: ['typescript'],
    },
    {
      message: 'update config.json and package.json files',
      expectedFiles: ['config.json', 'package.json'],
    },
    {
      message: 'build a React component with Express backend',
      expectedFrameworks: ['react', 'express'],
    },
    {
      message: 'check https://api.example.com/users endpoint',
      expectedUrls: ['https://api.example.com/users'],
    },
  ];

  for (const test of entityTests) {
    const result = parseIntent(test.message);
    console.log(`Message: "${test.message}"`);
    console.log(`Entities:`, JSON.stringify(result.entities, null, 2));
    console.log();
  }
}

/**
 * Run all tests
 */
if (require.main === module) {
  runIntentParserTests();
  console.log();
  testEntityExtraction();
}
