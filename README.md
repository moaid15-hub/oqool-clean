# 🧠 Oqool Clean - AI-Powered CLI & Development Tools

> **عقول كلين** - أدوات تطوير ذكية مدعومة بالذكاء الاصطناعي

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

---

## 📋 المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [الميزات](#-الميزات)
- [التثبيت](#-التثبيت)
- [الاستخدام](#-الاستخدام)
- [البنية](#-البنية)
- [الأدوات المتاحة](#-الأدوات-المتاحة)
- [الترخيص](#-الترخيص)

---

## 🎯 نظرة عامة

**Oqool Clean** هو مشروع Monorepo يحتوي على أدوات CLI قوية مدعومة بالذكاء الاصطناعي للمطورين.

### المكونات الرئيسية:

- **@oqool/cli**: أداة سطر أوامر تفاعلية
- **@oqool/shared**: مكتبة مشتركة تحتوي على 107 أداة وAgent

---

## ✨ الميزات

### 🤖 **20 AI Agents متخصصة:**
- مهندس معماري (Architect)
- مطور Backend
- مهندس Frontend
- مصمم UI/UX
- مختبِر (Tester)
- مراجع كود (Code Reviewer)
- خبير أمان (Security)
- متخصص SEO
- و13 Agent آخر!

### 🛠️ **68 نظام أساسي:**
- تحليل وتنفيذ الكود
- إدارة Git وPull Requests
- أنظمة تعلم ذاتي
- معالجة اللغة الطبيعية (NLP)
- رؤية حاسوبية
- تحليلات تنبؤية
- وأكثر من 60 نظام آخر!

### 🌐 **دعم متعدد لمقدمي AI:**
- ✅ Google Gemini (الأسرع)
- ✅ Anthropic Claude (الأذكى)
- ✅ OpenAI GPT-4
- ✅ DeepSeek
- ✅ Ollama (محلي - مجاني)

---

## 📦 التثبيت

### المتطلبات:
- Node.js 18+
- npm أو yarn

### الخطوات:

```bash
# استنساخ المستودع
git clone https://github.com/YOUR_USERNAME/oqool-clean.git
cd oqool-clean

# تثبيت Dependencies
npm install

# بناء المشروع
npm run build

# (اختياري) تثبيت CLI عالمياً
npm link
```

---

## ⚙️ الإعداد

### 1. إعداد API Keys:

```bash
# انسخ ملف البيئة المثالي
cp .env.example .env

# عدّل .env وأضف مفاتيح API الخاصة بك
nano .env
```

### 2. احصل على API Keys:

| المزود | الرابط | التكلفة |
|--------|--------|---------|
| **Gemini** | [aistudio.google.com](https://aistudio.google.com/app/apikey) | ⚡ الأسرع والأرخص |
| **Claude** | [console.anthropic.com](https://console.anthropic.com/) | 🧠 الأذكى |
| **OpenAI** | [platform.openai.com](https://platform.openai.com) | 💰 متوازن |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com) | 💵 رخيص |
| **Ollama** | [ollama.ai](https://ollama.ai) | 🆓 مجاني (محلي) |

---

## 🚀 الاستخدام

### تشغيل CLI:

```bash
# باستخدام npm
npm run dev:cli

# أو إذا ثبت عالمياً
oqool --help
```

### بناء المشروع:

```bash
# بناء كل شيء
npm run build

# بناء CLI فقط
npm run build:cli

# بناء Shared فقط
npm run build:shared
```

---

## 📂 البنية

```
oqool-clean/
├── packages/
│   ├── cli/                # @oqool/cli - أداة CLI
│   │   ├── src/           # الكود المصدري
│   │   ├── dist/          # البناء المترجم
│   │   └── package.json
│   │
│   └── shared/            # @oqool/shared - المكتبة المشتركة
│       ├── src/
│       │   ├── agents/    # 20 AI Agent
│       │   ├── core/      # 68 نظام أساسي
│       │   ├── ai-gateway/# 6 خدمات AI
│       │   └── ...
│       └── package.json
│
├── package.json           # تعريف Monorepo
├── tsconfig.json          # إعدادات TypeScript
├── turbo.json             # إعدادات Turborepo
└── .env.example           # مثال متغيرات البيئة
```

---

## 🔧 الأدوات المتاحة

### إجمالي الأدوات: **107**

| الفئة | العدد | الوصف |
|------|------|-------|
| **Core Systems** | 68 | أنظمة أساسية للتحليل والتنفيذ |
| **AI Agents** | 20 | Agents متخصصة |
| **AI Services** | 6 | خدمات مقدمي AI |
| **AI Tools** | 3 | أدوات AI إضافية |
| **Integrations** | 3 | تكاملات خارجية |
| **Code Intelligence** | 2 | تحليل ذكي للكود |
| **Utilities** | 5 | أدوات مساعدة |

---

## 📊 الإحصائيات

- **107 أداة وAgent**
- **36,058 سطر كود** في Core فقط
- **415 MB** حجم المشروع
- **306 حزمة** npm
- **دعم كامل للغة العربية** 🇸🇦

---

## 🤝 المساهمة

نرحب بالمساهمات! الرجاء:

1. Fork المستودع
2. إنشاء branch للميزة (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

---

## 📝 الترخيص

هذا المشروع مرخص تحت **MIT License** - انظر ملف [LICENSE](LICENSE) للتفاصيل.

---

## 👨‍💻 الفريق

**Oqool Team** - بناء أدوات تطوير ذكية

---

## 🙏 شكر خاص

- [Anthropic](https://anthropic.com) - Claude AI
- [Google](https://ai.google.dev/) - Gemini
- [OpenAI](https://openai.com) - GPT Models
- [DeepSeek](https://deepseek.com) - DeepSeek AI
- [Ollama](https://ollama.ai) - Local AI

---

<div align="center">

**صُنع بـ ❤️ من فريق Oqool**

[الموقع](https://oqool.dev) • [التوثيق](https://docs.oqool.dev) • [المجتمع](https://community.oqool.dev)

</div>
