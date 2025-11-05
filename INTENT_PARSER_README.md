# 🎯 Intent Parser - نظام تحليل النوايا المتقدم

نظام ذكي لتحليل نوايا المستخدم من الأوامر النصية بدعم كامل للغتين العربية والإنجليزية.

---

## 📍 الموقع

```
packages/cli/src/intent-parser.ts
packages/cli/src/smart-chat.ts (integrated)
```

---

## ✨ الميزات

### 1️⃣ **12 نوع من النوايا**
- ✅ `generate` - إنشاء كود/ملفات جديدة
- ✅ `modify` - تعديل كود موجود
- ✅ `explain` - شرح وتوضيح
- ✅ `review` - مراجعة الكود
- ✅ `debug` - إصلاح الأخطاء
- ✅ `optimize` - تحسين الأداء
- ✅ `test` - إنشاء/تشغيل اختبارات
- ✅ `deploy` - نشر ورفع
- ✅ `git` - عمليات Git
- ✅ `file` - عمليات الملفات
- ✅ `search` - البحث
- ✅ `chat` - محادثة عامة

### 2️⃣ **استخراج كيانات متقدم**
- 📄 File paths
- 💻 Programming languages
- 🔧 Frameworks/libraries
- 📁 Directory paths
- 🔢 Numbers
- 🔗 URLs

### 3️⃣ **دعم ثنائي اللغة**
- 🇬🇧 English patterns
- 🇸🇦 Arabic patterns
- 🌐 Mixed language detection

### 4️⃣ **تحليل ذكي**
- 📊 Confidence scoring
- 🎯 Sub-intent detection
- 💡 Smart suggestions
- 🔄 Pattern matching

---

## 📖 الاستخدام

### مثال بسيط:

```typescript
import { parseIntent } from './intent-parser';

const result = parseIntent('create a new React component');

console.log(result.type);        // 'generate'
console.log(result.confidence);  // 0.95
console.log(result.entities);    // { frameworks: ['react'] }
console.log(result.subIntent);   // 'generate_component'
console.log(result.suggestions); // ['Add tests...', 'Review...']
```

### أمثلة بالعربي:

```typescript
// توليد كود
parseIntent('أنشئ ملف جديد للمصادقة');
// => { type: 'generate', language: 'ar', confidence: 0.95 }

// مراجعة
parseIntent('راجع الكود في auth.ts');
// => { type: 'review', entities: { files: ['auth.ts'] } }

// إصلاح
parseIntent('صحح الخطأ في النظام');
// => { type: 'debug', language: 'ar' }
```

---

## 🔍 أمثلة شاملة

### 1. Generate Intent

```typescript
// English
parseIntent('create a user authentication system');
parseIntent('generate API endpoints');
parseIntent('build a React component');

// Arabic
parseIntent('أنشئ نظام مصادقة');
parseIntent('اصنع واجهة برمجية');
parseIntent('اكتب دالة جديدة');

// Result:
{
  type: 'generate',
  confidence: 0.95,
  subIntent: 'generate_api',
  entities: { ... },
  suggestions: [
    'Add tests for the generated code',
    'Review the generated code'
  ]
}
```

### 2. Modify Intent

```typescript
// English
parseIntent('update the login function');
parseIntent('refactor user service');
parseIntent('fix the bug in payment.ts');

// Arabic
parseIntent('عدّل الكود في index.js');
parseIntent('حسّن الأداء');
parseIntent('غيّر الدالة');

// Result:
{
  type: 'modify',
  confidence: 0.9,
  entities: {
    files: ['payment.ts'],
    actions: ['fix']
  }
}
```

### 3. Explain Intent

```typescript
// English
parseIntent('explain how JWT works');
parseIntent('what is this function doing?');
parseIntent('how does authentication work?');

// Arabic
parseIntent('اشرح لي كيف يعمل هذا');
parseIntent('ماذا تفعل هذه الدالة؟');
parseIntent('كيف يعمل النظام؟');

// Result:
{
  type: 'explain',
  confidence: 0.85,
  language: 'ar'
}
```

### 4. Git Intent

```typescript
parseIntent('git commit -m "add feature"');
parseIntent('push changes to github');
parseIntent('create a new branch for testing');

// Result:
{
  type: 'git',
  confidence: 1.0,
  subIntent: 'git_commit',
  entities: {
    actions: ['commit', 'push']
  }
}
```

### 5. File Operations

```typescript
parseIntent('read the config.json file');
parseIntent('delete old log files');
parseIntent('open src/auth/login.ts');

// Result:
{
  type: 'file',
  confidence: 0.95,
  entities: {
    files: ['config.json'],
    locations: ['src/auth/']
  }
}
```

---

## 🧪 الاختبار

### تشغيل الاختبارات:

```bash
npm run test:intent-parser
```

أو:

```typescript
import { runIntentParserTests, testEntityExtraction } from './intent-parser.test';

// Run all tests
runIntentParserTests();

// Test entity extraction specifically
testEntityExtraction();
```

### نتائج الاختبار:

```
🧪 Running Intent Parser Tests...

✅ PASS: "create a new React component"
   Intent: generate (confidence: 0.95)
   ✓ Entity frameworks: ["react"]
   Sub-intent: generate_component
   Suggestions: Add tests for the generated code, Review the generated code

✅ PASS: "أنشئ ملف جديد لمصادقة المستخدم"
   Intent: generate (confidence: 0.95)
   Language: ar

...

📊 Test Results:
   ✅ Passed: 28/30
   ❌ Failed: 2/30
   📈 Success Rate: 93%
```

---

## 🔧 التخصيص

### إضافة نمط نية جديد:

```typescript
import { IntentParser } from './intent-parser';

const parser = new IntentParser();

// يمكنك توسيع الـ patterns في الكود المصدري
// أو إنشاء parser مخصص
```

### تعديل الـ Confidence Thresholds:

```typescript
const result = parseIntent(message);

if (result.confidence > 0.8) {
  // High confidence - proceed
} else if (result.confidence > 0.5) {
  // Medium confidence - ask for confirmation
} else {
  // Low confidence - ask for clarification
}
```

---

## 🎯 الدمج مع Smart Chat

تم دمج الـ Intent Parser مع نظام Smart Chat:

```typescript
import { SmartChat, createSmartChat } from './smart-chat';

const chat = createSmartChat(
  contextManager,
  aiAdapter,
  fileManager,
  versionGuardian,
  { verbose: true }  // Shows intent info
);

// الـ Intent Parser يعمل تلقائياً
await chat.chat('create a new authentication system');

// Output:
// 🎯 Intent: generate (95%)
// 💭 Claude:
// ...
```

---

## 📊 الإحصائيات

```
📈 الكود:
• 520 سطر TypeScript
• 12 نوع نية
• 50+ نمط للتطابق
• دعم كامل للعربية والإنجليزية

🧪 الاختبار:
• 30+ حالة اختبار
• 93%+ معدل نجاح
• Entity extraction tests
• Multi-language tests
```

---

## 🚀 الميزات القادمة

- [ ] دعم لغات إضافية (French, Spanish)
- [ ] Machine learning للتحسين التلقائي
- [ ] Custom pattern training
- [ ] Intent history analysis
- [ ] Context-aware parsing

---

## 💡 نصائح للاستخدام

### 1. استخدم أفعال واضحة:
```typescript
✅ "create a new file"
✅ "أنشئ ملف جديد"
❌ "file thing please"
```

### 2. حدد الملفات بوضوح:
```typescript
✅ "update auth.ts"
✅ "read config.json"
❌ "fix that file"
```

### 3. استخدم الكلمات المفتاحية:
```typescript
✅ "review the code"
✅ "راجع الكود"
✅ "explain how it works"
```

---

## 🔗 ملفات ذات علاقة

- `packages/cli/src/intent-parser.ts` - المحلل الرئيسي
- `packages/cli/src/smart-chat.ts` - التكامل مع Chat
- `packages/cli/src/intent-parser.test.ts` - الاختبارات
- `packages/shared/src/core/request-validator.ts` - التحقق من الطلبات

---

**تم الإضافة**: 2025-11-05
**الحالة**: ✅ جاهز للاستخدام
**الإصدار**: 1.0.0
