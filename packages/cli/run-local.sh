#!/bin/bash
# ============================================
# 🚀 تشغيل oqool محلياً مع Claude API
# ============================================

cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 oqool - وضع التشغيل المحلي"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# التحقق من وجود ملف .env
if [ ! -f ".env" ]; then
    echo "⚠️  ملف .env غير موجود!"
    echo "سيتم إنشاؤه..."

    cat > .env << 'EOF'
# Claude API Key
ANTHROPIC_API_KEY=your-api-key-here

# OpenAI API Key (اختياري)
# OPENAI_API_KEY=your-openai-key

NODE_ENV=development
USE_LOCAL_CLAUDE=true
EOF

    echo "✅ تم إنشاء ملف .env"
    echo "⚠️  يرجى تعديل ANTHROPIC_API_KEY في ملف .env"
    echo ""
    exit 1
fi

# التحقق من البناء
if [ ! -d "dist" ]; then
    echo "📦 بناء المشروع..."
    npm run build
    echo ""
fi

# تشغيل النسخة المحلية
echo "🚀 تشغيل oqool..."
echo ""

node --loader ts-node/esm oqool-local.ts "$@"
