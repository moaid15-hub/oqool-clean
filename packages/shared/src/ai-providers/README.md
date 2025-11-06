# 🚀 نظام AI Providers الموحد

نظام متكامل لإدارة مزودي الذكاء الاصطناعي مع دعم متعدد المزودين وتوجيه ذكي وإدارة التكلفة.

## 📁 هيكل المشروع

```
ai-providers/
├── adapters/              # محولات المزودين
│   ├── base-adapter.ts
│   ├── claude-adapter.ts
│   ├── deepseek-adapter.ts
│   └── gemini-adapter.ts
├── interfaces/            # الواجهات الموحدة
│   ├── iai-provider.interface.ts
│   ├── provider-config.interface.ts
│   └── unified-types.interface.ts
├── registry/              # سجل المزودين
│   ├── provider-factory.ts
│   └── provider-registry.ts
├── router/                # الموجه الذكي ✨ جديد
│   ├── intelligent-router.ts     (161 سطر)
│   ├── provider-selector.ts      (171 سطر)
│   ├── fallback-manager.ts       (142 سطر)
│   └── cost-optimizer.ts         (283 سطر)
├── integration/           # التكامل ✨ جديد
│   ├── agent-loop-integration.ts (258 سطر)
│   ├── tool-execution-integration.ts (365 سطر)
│   └── cli-integration.ts        (356 سطر)
├── monitoring/            # المراقبة
│   ├── provider-monitor.ts
│   ├── cost-tracker.ts
│   └── metrics-collector.ts
└── utils/                 # أدوات مساعدة
    ├── error-handler.ts
    ├── message-converter.ts
    └── tool-adapter.ts
```

## ✅ الملفات المكتملة

### 🎯 Router (الموجه الذكي)
- ✅ **intelligent-router.ts** - الموجه الذكي الكامل مع اختيار تلقائي للمزود
- ✅ **provider-selector.ts** - محدد المزود المتقدم مع تحليل الأداء
- ✅ **fallback-manager.ts** - مدير Fallback المتكامل مع إعادة المحاولة
- ✅ **cost-optimizer.ts** - محسن التكلفة مع تتبع وتوصيات

### 🔗 Integration (التكامل)
- ✅ **agent-loop-integration.ts** - تكامل Agent Loop مع النظام الجديد
- ✅ **tool-execution-integration.ts** - تكامل تنفيذ الأدوات
- ✅ **cli-integration.ts** - تكامل CLI الكامل

### 📦 Index
- ✅ **index.ts** - تم تحديثه بتصدير جميع المكونات الجديدة

## 🚀 الاستخدام السريع

### 1. إنشاء النظام الكامل

```typescript
import { createCompleteAISystem } from './ai-providers';

const { registry, router, agentIntegration, toolIntegration, cliIntegration } = createCompleteAISystem();
```

### 2. استخدام الموجه الذكي

```typescript
// محادثة بسيطة مع اختيار تلقائي للمزود
const response = await router.chat([
  { role: 'user', content: 'مرحباً' }
]);

// محادثة مع أدوات
const responseWithTools = await router.chatWithTools(
  messages,
  tools,
  {
    budget: 0.1,
    speedPriority: true
  }
);
```

### 3. تكامل Agent Loop

```typescript
const result = await agentIntegration.executeAgentLoop(
  messages,
  tools,
  {
    provider: 'claude', // اختياري
    budget: 0.05
  }
);
```

### 4. تكامل CLI

```typescript
// تهيئة CLI
await cliIntegration.initialize();

// معالجة أمر محادثة
const result = await cliIntegration.handleChatCommand(
  'ما هو الذكاء الاصطناعي؟',
  {
    speedPriority: true
  }
);

// التبديل بين المزودين
await cliIntegration.switchProvider('deepseek');

// عرض الإحصائيات
const stats = cliIntegration.showStats();
```

### 5. تنفيذ الأدوات

```typescript
// تسجيل أدوات
toolIntegration.registerTools([
  {
    name: 'calculator',
    description: 'حاسبة بسيطة',
    parameters: {},
    execute: async (params) => { /* ... */ }
  }
]);

// تنفيذ مع أدوات
const result = await toolIntegration.executeWithTools(
  messages,
  ['calculator']
);
```

## 📊 الميزات الرئيسية

### 🎯 الموجه الذكي (Intelligent Router)
- اختيار تلقائي للمزود الأمثل
- تحليل المهمة (التعقيد، التكلفة، المتطلبات)
- دعم التفضيلات (السرعة، الجودة، الميزانية)
- إحصائيات شاملة

### 🔄 إدارة Fallback
- تبديل تلقائي عند الفشل
- إعادة محاولة ذكية
- Exponential backoff
- ترتيب fallback ذكي حسب القدرات

### 💰 محسن التكلفة
- تقدير التكلفة قبل التنفيذ
- اختيار المزود الأرخص
- تتبع التكلفة الفعلية
- توصيات لتقليل التكلفة
- تقارير مفصلة حسب المزود

### 🔗 تكامل شامل
- Agent Loop متعدد الخطوات
- تنفيذ الأدوات مع حلقات متكررة
- CLI كامل مع تبديل المزودين
- تتبع المحادثات

## 📈 الإحصائيات

```
المجموع الكلي: 1,736 سطر من الكود

Router:        757 سطر
Integration:   979 سطر
```

## 🔧 المتطلبات

تأكد من تعيين متغيرات البيئة:
```bash
export ANTHROPIC_API_KEY="your-claude-key"
export DEEPSEEK_API_KEY="your-deepseek-key"
export GEMINI_API_KEY="your-gemini-key"
```

## 📝 ملاحظات

- جميع الملفات تم إنشاؤها وفقاً للمواصفات المطلوبة
- الكود يحتوي على توثيق JSDoc كامل باللغة العربية
- واجهات TypeScript محددة بوضوح
- معالجة أخطاء شاملة
- نظام مراقبة وإحصائيات متكامل

---

تم الإنشاء بواسطة: GitHub Copilot
التاريخ: 6 نوفمبر 2025
