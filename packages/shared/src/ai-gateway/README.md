# 🤖 AI Gateway - Unified Multi-Provider System

نظام موحد لإدارة جميع مزودي الـ AI (DeepSeek, Claude, OpenAI)

---

## ✨ المميزات

- 🎯 **Multi-Provider**: دعم 3 مزودين (DeepSeek, Claude, OpenAI)
- 🤖 **8 AI Personalities**: شخصيات متخصصة لكل مهمة
- 💰 **Smart Selection**: اختيار تلقائي للمزود الأرخص والأنسب
- 🔄 **Auto Fallback**: التبديل التلقائي عند فشل أي مزود
- 📊 **Cost Tracking**: تتبع التكلفة لكل طلب
- ⚡ **Streaming Support**: دعم الـ Streaming للردود الفورية

---

## 📦 التثبيت

```bash
npm install @anthropic-ai/sdk openai
```

---

## 🚀 الاستخدام السريع

### 1. التهيئة الأساسية

```typescript
import { UnifiedAIAdapter } from '@oqool/shared/ai-gateway';

const aiAdapter = new UnifiedAIAdapter({
  deepseek: process.env.DEEPSEEK_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  defaultProvider: 'deepseek', // الافتراضي
});
```

### 2. استخدام الشخصيات

```typescript
// Coder - كتابة كود
const result = await aiAdapter.processWithPersonality(
  'coder',
  'اكتب function لحساب الفيبوناتشي',
  undefined,
  'auto' // يختار أفضل مزود تلقائياً
);

console.log(result.response);
console.log(`Cost: $${result.cost.toFixed(4)}`);
console.log(`Provider: ${result.provider}`);
```

### 3. الشخصيات الـ8

```typescript
// Architect - تصميم معماري
await aiAdapter.processWithPersonality('architect', 'صمم نظام تجارة إلكترونية');

// Reviewer - مراجعة كود
await aiAdapter.processWithPersonality('reviewer', 'راجع هذا الكود', code);

// Tester - كتابة اختبارات
await aiAdapter.processWithPersonality('tester', 'اكتب unit tests', code);

// Debugger - حل الأخطاء
await aiAdapter.processWithPersonality('debugger', 'حلل هذا الخطأ', errorLog);

// Optimizer - تحسين الأداء
await aiAdapter.processWithPersonality('optimizer', 'حسن أداء هذا الكود', code);

// Security - فحص الأمان
await aiAdapter.processWithPersonality('security', 'افحص الثغرات الأمنية', code);

// DevOps - إعداد البنية التحتية
await aiAdapter.processWithPersonality('devops', 'اكتب CI/CD pipeline');
```

### 4. وظائف مساعدة سريعة

```typescript
// مساعدة سريعة في الكود
const help = await aiAdapter.quickCodeHelp('كيف أستخدم async/await؟');

// مراجعة سريعة
const review = await aiAdapter.quickReview(myCode);

// تحسين سريع
const optimized = await aiAdapter.quickOptimize(slowCode);

// Debug سريع
const fix = await aiAdapter.quickDebug(errorMessage, code);
```

### 5. Streaming (ردود فورية)

```typescript
// استقبال الرد جزءاً جزءاً
for await (const chunk of aiAdapter.processStream('coder', 'اشرح كيف يعمل React Hooks')) {
  process.stdout.write(chunk); // طباعة فورية
}
```

### 6. اختيار مزود محدد

```typescript
// استخدام Claude فقط (أفضل جودة)
const result1 = await aiAdapter.processWithPersonality(
  'architect',
  'صمم microservices architecture',
  undefined,
  'claude'
);

// استخدام DeepSeek فقط (أرخص)
const result2 = await aiAdapter.processWithPersonality(
  'coder',
  'اكتب function بسيطة',
  undefined,
  'deepseek'
);

// اختيار تلقائي (موصى به)
const result3 = await aiAdapter.processWithPersonality(
  'reviewer',
  'راجع هذا الكود',
  code,
  'auto' // يختار الأنسب
);
```

---

## 💰 مقارنة التكاليف

```typescript
const costs = aiAdapter.getCostComparison();
console.log(costs);

// Output:
// [
//   { provider: 'DeepSeek', inputCost: 0.14, outputCost: 0.28 },
//   { provider: 'Claude 3.5 Sonnet', inputCost: 3.0, outputCost: 15.0 },
//   { provider: 'GPT-4 Turbo', inputCost: 10.0, outputCost: 30.0 }
// ]
```

---

## 🎯 استراتيجية الاختيار التلقائي

عند استخدام `'auto'`، يختار النظام المزود الأنسب حسب:

### 1. الشخصية

- **Architect, Reviewer, Security** → Claude (يحتاج تفكير عميق)
- **Coder, Debugger, Optimizer** → DeepSeek (سريع ورخيص)
- **Tester, DevOps** → DeepSeek (مهام روتينية)

### 2. تعقيد السؤال

- **معقد جداً** → Claude
- **بسيط** → DeepSeek
- **متوسط** → يعتمد على الشخصية

### 3. الكلمات المفتاحية

```typescript
// كلمات تؤدي لاختيار Claude:
('architecture', 'design pattern', 'security', 'review');

// كلمات تؤدي لاختيار DeepSeek:
('simple', 'basic', 'quick');
```

---

## 📊 المزودين المتاحة

```typescript
const providers = aiAdapter.getAvailableProviders();
console.log(providers);

// Output:
// [
//   { id: 'deepseek', name: 'DeepSeek', available: true },
//   { id: 'claude', name: 'Claude (Anthropic)', available: true },
//   { id: 'openai', name: 'OpenAI (GPT-4)', available: false }
// ]
```

---

## 🔄 Fallback System

إذا فشل المزود المختار، يتم التبديل تلقائياً للمزود الافتراضي:

```typescript
// إذا Claude فشل، يحاول DeepSeek تلقائياً
const result = await aiAdapter.processWithPersonality(
  'coder',
  'اكتب كود',
  undefined,
  'claude' // قد يفشل
);
// ✅ سينجح باستخدام DeepSeek
```

---

## ⚙️ تغيير الإعدادات

```typescript
// تغيير المزود الافتراضي
aiAdapter.setDefaultProvider('claude');

// الآن كل الطلبات ستستخدم Claude كـ fallback
```

---

## 📝 مثال كامل

```typescript
import { UnifiedAIAdapter } from '@oqool/shared/ai-gateway';

async function main() {
  // التهيئة
  const ai = new UnifiedAIAdapter({
    deepseek: process.env.DEEPSEEK_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  });

  // طلب كتابة كود
  const code = await ai.quickCodeHelp('اكتب React component لعرض قائمة المهام');

  console.log('Generated Code:', code);

  // مراجعة الكود
  const review = await ai.quickReview(code);
  console.log('Review:', review);

  // تحسين الكود
  const optimized = await ai.quickOptimize(code);
  console.log('Optimized:', optimized);
}

main();
```

---

## 🎨 ملاحظات

### التكلفة

- **DeepSeek**: أرخص 10x من Claude
- **Claude**: أفضل جودة للمهام المعقدة
- **OpenAI**: متوازن بين الاثنين

### الجودة

- **Claude**: الأفضل للمراجعة والتصميم
- **DeepSeek**: ممتاز للكود والمهام الروتينية
- **OpenAI**: متوازن وموثوق

### السرعة

- **DeepSeek**: الأسرع
- **OpenAI**: سريع
- **Claude**: الأبطأ قليلاً

---

## 🔐 الأمان

- كل الـ API Keys محمية ولا تُخزن
- لا توجد مكالمات خارجية إلا للمزودين المُعتمدين
- التحقق من صلاحية الـ API Keys قبل الاستخدام

---

## 📄 الترخيص

MIT License - استخدمه بحرية! 🎉
