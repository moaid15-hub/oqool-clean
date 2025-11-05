# 🔧 نظام الإصلاح التلقائي المتقدم

## Oqool Auto-Fix System with Stages & Priorities

نظام إصلاح تلقائي متقدم بالمراحل والأولويات (P1, P2, P3) لتحليل وإصلاح الكود بذكاء.

---

## 🎯 المميزات الرئيسية

### ✅ نظام المراحل الذكي

- **المرحلة 1 (P1)**: أخطاء حرجة - **إصلاح فوري**
  - ✅ Syntax Errors - إصلاح تلقائي
  - 🔒 Security Issues - يسأل المستخدم

- **المرحلة 2 (P2)**: أخطاء الأنواع - **إصلاح تلقائي**
  - 🏷️ TypeScript Types - إصلاح تلقائي

- **المرحلة 3 (P3)**: التحسينات - **اقتراحات + إصلاح**
  - ⚡ Performance - اقتراحات فقط
  - 🎨 Code Style - إصلاح تلقائي

---

## 🚀 التثبيت والاستخدام

### التثبيت

```bash
# النظام جزء من oqool-code
npm install -g oqool-code
```

### الاستخدام السريع

```bash
# إصلاح ملف واحد
oqool-code auto-fix src/app.ts

# إصلاح تلقائي بدون سؤال
oqool-code auto-fix src/app.ts --auto-apply

# عرض المراحل المتاحة
oqool-code auto-fix --show-stages
```

---

## 📋 المراحل التفصيلية

### 🔴 P1 - أخطاء حرجة (إصلاح فوري)

#### 1️⃣ Syntax Fixing

**الهدف**: إصلاح أخطاء البناء اللغوي التي تمنع تشغيل الكود

**يكشف**:

- أخطاء Syntax
- فواصل منقوطة مفقودة
- أقواس غير متطابقة
- علامات تنصيص غير مغلقة

**الإصلاح**: ⚡ تلقائي

**مثال**:

```bash
oqool-code auto-fix src/app.ts --only syntax --auto-apply
```

#### 2️⃣ Security Fixing

**الهدف**: اكتشاف وإصلاح الثغرات الأمنية

**يكشف**:

- استخدام `eval()` الخطير
- SQL Injection
- XSS vulnerabilities
- تشفير ضعيف (MD5, SHA1)
- مفاتيح مشفرة في الكود
- Path Traversal
- Command Injection

**الإصلاح**: ❓ يسأل المستخدم (للأمان)

**مثال**:

```typescript
// قبل
eval(userInput); // خطر!
element.innerHTML = data; // XSS!

// بعد
// REMOVED: eval() - unsafe
element.textContent = data; // آمن
```

---

### 🟡 P2 - أخطاء الأنواع (إصلاح تلقائي)

#### 3️⃣ Type Fixing

**الهدف**: إصلاح أخطاء TypeScript والأنواع

**يكشف**:

- متغيرات بدون نوع
- دوال بدون نوع إرجاع
- معاملات بدون أنواع
- استخدام `any` غير الآمن
- أخطاء TypeScript

**الإصلاح**: ⚡ تلقائي

**مثال**:

```typescript
// قبل
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// بعد
function calculateTotal(items: Array<{ price: number }>): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

### 🔵 P3 - التحسينات (اقتراحات + إصلاح)

#### 4️⃣ Performance Optimization

**الهدف**: اكتشاف مشاكل الأداء واقتراح حلول

**يكشف**:

- حلقات متداخلة (O(n²), O(n³))
- عمليات مكلفة في الحلقات
- عمليات DOM متكررة
- استخدام غير فعال للذاكرة
- Regular Expressions بطيئة
- Array operations غير فعالة

**الإصلاح**: 💡 اقتراحات فقط

**مثال**:

```bash
# يعرض تقرير الأداء
oqool-code auto-fix src/app.ts --only performance
```

#### 5️⃣ Style Fixing

**الهدف**: تحسين أسلوب الكود وجعله متسقاً

**يكشف**:

- اصطلاحات التسمية (camelCase, PascalCase)
- استخدام `var` بدلاً من `const/let`
- استخدام `==` بدلاً من `===`
- أسطر طويلة جداً
- مسافات زائدة
- `console.log` في الكود
- دوال طويلة جداً

**الإصلاح**: ⚡ تلقائي

**مثال**:

```typescript
// قبل
var user_name = 'Ahmed';
if (age == 18) {
  console.log('Adult');
}

// بعد
const userName = 'Ahmed';
if (age === 18) {
  // TODO: Remove console.log
  console.log('Adult');
}
```

---

## 🎮 أمثلة الاستخدام

### 1. إصلاح شامل

```bash
# كل المراحل + تفاعلي
oqool-code auto-fix src/app.ts

# كل المراحل + تلقائي
oqool-code auto-fix src/app.ts --auto-apply
```

### 2. إصلاح مراحل محددة

```bash
# P1 فقط (Syntax + Security)
oqool-code auto-fix src/app.ts --only syntax,security

# P2 فقط (Types)
oqool-code auto-fix src/app.ts --only types

# P3 فقط (Performance + Style)
oqool-code auto-fix src/app.ts --only performance,style
```

### 3. تخطي مراحل

```bash
# كل شيء ماعدا Performance
oqool-code auto-fix src/app.ts --skip performance

# بدون Style
oqool-code auto-fix src/app.ts --no-style

# بدون Performance والـ Style
oqool-code auto-fix src/app.ts --no-performance --no-style
```

### 4. Pipeline متدرج

```bash
# خطوة 1: P1
oqool-code auto-fix src/app.ts --only syntax,security --auto-apply

# خطوة 2: P2
oqool-code auto-fix src/app.ts --only types --auto-apply

# خطوة 3: P3
oqool-code auto-fix src/app.ts --only performance,style --auto-apply
```

### 5. ملفات متعددة

```bash
# استخدام shell loop
for file in src/**/*.ts; do
  oqool-code auto-fix "$file" --auto-apply
done
```

---

## 💻 الاستخدام البرمجي

### مثال أساسي

```typescript
import { createAutoFixSystem } from './auto-fix-system';

const autoFix = createAutoFixSystem();

const result = await autoFix.fix({
  file: 'src/app.ts',
  autoApply: true,
});

console.log(`تم إصلاح ${result.fixedIssues} مشكلة`);
```

### مثال متقدم

```typescript
import { createAutoFixSystem } from './auto-fix-system';

const autoFix = createAutoFixSystem('./my-project');

// 1. عرض المراحل
const stages = autoFix.getStages();
console.log(`المراحل المتاحة: ${stages.length}`);

// 2. تشغيل إصلاح محدد
const result = await autoFix.fix({
  file: 'src/app.ts',
  onlyStages: ['syntax', 'security'],
  autoApply: true,
  interactive: false,
});

// 3. فحص النتائج
if (result.success) {
  console.log('✅ نجح الإصلاح');
  console.log(`المشاكل: ${result.totalIssues}`);
  console.log(`المصلحة: ${result.fixedIssues}`);
  console.log(`الاقتراحات: ${result.suggestedIssues}`);

  // 4. تفاصيل كل مرحلة
  for (const [stage, details] of Object.entries(result.stages)) {
    console.log(`${stage}: ${details.fixed} إصلاح`);
  }
}
```

### Pipeline كامل

```typescript
async function fullPipeline(file: string) {
  const autoFix = createAutoFixSystem();

  // مرحلة 1: P1
  await autoFix.fix({
    file,
    onlyStages: ['syntax', 'security'],
    autoApply: true,
  });

  // مرحلة 2: P2
  await autoFix.fix({
    file,
    onlyStages: ['types'],
    autoApply: true,
  });

  // مرحلة 3: P3
  await autoFix.fix({
    file,
    onlyStages: ['performance', 'style'],
    autoApply: true,
  });
}
```

---

## 📊 تقارير ومخرجات

### تقرير الإصلاح

```
🔧 ════════════════════════════════════════════════
   نظام الإصلاح التلقائي المتقدم
════════════════════════════════════════════════

📋 المراحل المحددة:

   1. ⚡ Syntax Fixing [P1] - إصلاح أخطاء البناء اللغوي تلقائياً
   2. ❓ Security Fixing [P1] - إصلاح الثغرات الأمنية (يسأل المستخدم)
   3. ⚡ Type Fixing [P2] - إصلاح أخطاء الأنواع تلقائياً

▶️  المرحلة 1/3: Syntax Fixing
──────────────────────────────────────────────────
✅ تم الفحص - وجد 3 مشاكل
   ✅ تم إصلاح 3 مشكلة

▶️  المرحلة 2/3: Security Fixing
──────────────────────────────────────────────────
✅ تم الفحص - وجد 2 مشاكل

⚠️  تم اكتشاف مشاكل أمنية:

   🔴 استخدام eval() خطير جداً
      السطر: 45
      💡 الحل المقترح: إزالة eval واستخدم بدائل آمنة

هل تريد إصلاح هذه المشاكل الأمنية? (Y/n)

════════════════════════════════════════════════
   📊 ملخص النتائج
════════════════════════════════════════════════

📊 إجمالي المشاكل المكتشفة: 5
✅ تم الإصلاح: 5
💡 الاقتراحات: 0
⏭️  المتخطى: 0

───────────────────────────────────────────────

Syntax Fixing:
   المشاكل: 3
   المصلحة: 3
   الاقتراحات: 0

Security Fixing:
   المشاكل: 2
   المصلحة: 2
   الاقتراحات: 0
```

---

## ⚙️ الإعدادات

### ملف التكوين `.oqoolrc.json`

```json
{
  "autoFix": {
    "enabled": true,
    "stages": {
      "syntax": { "enabled": true, "autoApply": true },
      "security": { "enabled": true, "autoApply": false },
      "types": { "enabled": true, "autoApply": true },
      "performance": { "enabled": true, "autoApply": false },
      "style": { "enabled": true, "autoApply": true }
    },
    "style": {
      "indentSize": 2,
      "useSemicolons": true,
      "singleQuote": true,
      "maxLineLength": 100
    }
  }
}
```

---

## 🔗 الملفات الرئيسية

```
auto-fix-system/
├── auto-fix-system.ts          # النظام الرئيسي
├── fix-stages/
│   ├── syntax-fixer.ts         # P1: إصلاح Syntax
│   ├── security-fixer.ts       # P1: إصلاح الأمان
│   ├── type-fixer.ts           # P2: إصلاح Types
│   ├── performance-optimizer.ts # P3: تحسين الأداء
│   └── style-fixer.ts          # P3: تحسين الأسلوب
├── cli-auto-fix-command.ts     # أمر CLI
├── auto-fix-examples.ts        # أمثلة
└── README.md                   # هذا الملف
```

---

## 🎯 أفضل الممارسات

### 1. ابدأ بـ P1

```bash
# تأكد أن الكود يعمل أولاً
oqool-code auto-fix src/ --only syntax,security --auto-apply
```

### 2. ثم P2

```bash
# أضف الأنواع
oqool-code auto-fix src/ --only types --auto-apply
```

### 3. أخيراً P3

```bash
# حسّن الأداء والأسلوب
oqool-code auto-fix src/ --only performance,style
```

### 4. استخدم Git

```bash
git add .
git commit -m "Before auto-fix"
oqool-code auto-fix src/ --auto-apply
git diff # راجع التغييرات
```

---

## 🤝 المساهمة

نرحب بالمساهمات! يمكنك:

- إضافة مراحل جديدة
- تحسين الكاشفات
- إضافة إصلاحات جديدة

---

## 📝 الترخيص

MIT License - Oqool AI

---

## 🚀 ما التالي؟

- [ ] دعم المزيد من اللغات (Python, Go, Rust)
- [ ] تكامل مع CI/CD
- [ ] تقارير HTML
- [ ] VS Code Extension
- [ ] Git Hooks Integration

---

**صُنع بـ ❤️ بواسطة Oqool AI Team**
