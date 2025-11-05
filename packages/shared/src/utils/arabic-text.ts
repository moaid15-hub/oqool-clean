// arabic-text.ts
// ============================================
// 🔤 Arabic Text Utilities - أدوات النصوص العربية
// ============================================

import { transliterate as tr } from 'transliterate';

// ============================================
// Types
// ============================================

export interface ArabicTextConfig {
  enableBidi?: boolean;
  enableReshaping?: boolean;
  direction?: 'rtl' | 'ltr';
}

export interface TransliterationOptions {
  unknown?: string;
  replace?: Record<string, string>;
  replaceAfter?: Record<string, string>;
  ignore?: string[];
}

// ============================================
// Arabic Text Utilities Class
// ============================================

export class ArabicTextUtils {
  private config: ArabicTextConfig;

  constructor(config: ArabicTextConfig = {}) {
    this.config = {
      enableBidi: true,
      enableReshaping: true,
      direction: 'rtl',
      ...config,
    };
  }

  // ============================================
  // 1. Detect if text contains Arabic
  // ============================================
  isArabic(text: string): boolean {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return arabicPattern.test(text);
  }

  // ============================================
  // 2. Get text direction
  // ============================================
  getTextDirection(text: string): 'rtl' | 'ltr' {
    return this.isArabic(text) ? 'rtl' : 'ltr';
  }

  // ============================================
  // 3. Normalize Arabic text
  // ============================================
  normalize(text: string): string {
    return text
      // Normalize Alef variants
      .replace(/[إأآا]/g, 'ا')
      // Normalize Yaa variants
      .replace(/ى/g, 'ي')
      // Normalize Taa Marbuta
      .replace(/ة/g, 'ه')
      // Remove diacritics (Tashkeel)
      .replace(/[\u064B-\u065F]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================
  // 4. Remove diacritics (Tashkeel)
  // ============================================
  removeDiacritics(text: string): string {
    return text.replace(/[\u064B-\u065F]/g, '');
  }

  // ============================================
  // 5. Transliterate Arabic to Latin
  // ============================================
  toLatinScript(arabicText: string, options?: TransliterationOptions): string {
    const defaultOptions: TransliterationOptions = {
      unknown: '?',
      replace: {
        ا: 'a',
        ب: 'b',
        ت: 't',
        ث: 'th',
        ج: 'j',
        ح: 'h',
        خ: 'kh',
        د: 'd',
        ذ: 'dh',
        ر: 'r',
        ز: 'z',
        س: 's',
        ش: 'sh',
        ص: 's',
        ض: 'd',
        ط: 't',
        ظ: 'z',
        ع: "'",
        غ: 'gh',
        ف: 'f',
        ق: 'q',
        ك: 'k',
        ل: 'l',
        م: 'm',
        ن: 'n',
        ه: 'h',
        و: 'w',
        ي: 'y',
        ة: 'h',
        ى: 'a',
        ء: "'",
        ...options?.replace,
      },
      ...options,
    };

    return tr(arabicText, defaultOptions);
  }

  // ============================================
  // 6. Extract Arabic words from mixed text
  // ============================================
  extractArabicWords(text: string): string[] {
    const arabicWordPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
    return text.match(arabicWordPattern) || [];
  }

  // ============================================
  // 7. Count Arabic characters
  // ============================================
  countArabicChars(text: string): number {
    const arabicChars = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g);
    return arabicChars ? arabicChars.length : 0;
  }

  // ============================================
  // 8. Check if text is RTL
  // ============================================
  isRTL(text: string): boolean {
    const arabicChars = this.countArabicChars(text);
    const totalChars = text.replace(/\s/g, '').length;
    return arabicChars / totalChars > 0.3; // More than 30% Arabic
  }

  // ============================================
  // 9. Wrap text with BiDi markers
  // ============================================
  wrapWithBidiMarkers(text: string): string {
    if (!this.isArabic(text)) return text;

    // RLM (Right-to-Left Mark) = \u200F
    // LRM (Left-to-Right Mark) = \u200E
    return `\u200F${text}\u200F`;
  }

  // ============================================
  // 10. Format Arabic numbers to Eastern Arabic
  // ============================================
  toEasternArabicNumerals(text: string): string {
    const westernToEastern: Record<string, string> = {
      '0': '٠',
      '1': '١',
      '2': '٢',
      '3': '٣',
      '4': '٤',
      '5': '٥',
      '6': '٦',
      '7': '٧',
      '8': '٨',
      '9': '٩',
    };

    return text.replace(/[0-9]/g, (digit) => westernToEastern[digit] || digit);
  }

  // ============================================
  // 11. Format Arabic numbers to Western
  // ============================================
  toWesternNumerals(text: string): string {
    const easternToWestern: Record<string, string> = {
      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',
    };

    return text.replace(/[٠-٩]/g, (digit) => easternToWestern[digit] || digit);
  }

  // ============================================
  // 12. Smart text direction detection
  // ============================================
  getSmartDirection(text: string): 'rtl' | 'ltr' | 'auto' {
    const arabicRatio = this.countArabicChars(text) / text.length;

    if (arabicRatio > 0.5) return 'rtl';
    if (arabicRatio < 0.1) return 'ltr';
    return 'auto';
  }

  // ============================================
  // 13. Validate Arabic text
  // ============================================
  validateArabicText(text: string): {
    isValid: boolean;
    hasArabic: boolean;
    hasDiacritics: boolean;
    arabicPercentage: number;
    wordCount: number;
  } {
    const hasArabic = this.isArabic(text);
    const hasDiacritics = /[\u064B-\u065F]/.test(text);
    const arabicChars = this.countArabicChars(text);
    const totalChars = text.replace(/\s/g, '').length;
    const arabicPercentage = totalChars > 0 ? (arabicChars / totalChars) * 100 : 0;
    const words = this.extractArabicWords(text);

    return {
      isValid: hasArabic && arabicChars > 0,
      hasArabic,
      hasDiacritics,
      arabicPercentage,
      wordCount: words.length,
    };
  }

  // ============================================
  // 14. Format text for display
  // ============================================
  formatForDisplay(text: string): {
    text: string;
    direction: 'rtl' | 'ltr';
    lang: string;
  } {
    const direction = this.getTextDirection(text);
    const lang = this.isArabic(text) ? 'ar' : 'en';

    return {
      text: this.config.enableBidi ? this.wrapWithBidiMarkers(text) : text,
      direction,
      lang,
    };
  }

  // ============================================
  // 15. Arabic-aware substring
  // ============================================
  substring(text: string, start: number, end?: number): string {
    // Handle RTL text correctly
    if (!this.isArabic(text)) {
      return text.substring(start, end);
    }

    // For Arabic, we need to be careful with diacritics
    const normalized = this.removeDiacritics(text);
    return normalized.substring(start, end);
  }
}

// ============================================
// Factory & Helpers
// ============================================

export function createArabicTextUtils(config?: ArabicTextConfig): ArabicTextUtils {
  return new ArabicTextUtils(config);
}

// Quick helper functions
export const arabicUtils = new ArabicTextUtils();

export const isArabic = (text: string) => arabicUtils.isArabic(text);
export const normalize = (text: string) => arabicUtils.normalize(text);
export const removeDiacritics = (text: string) => arabicUtils.removeDiacritics(text);
export const toLatinScript = (text: string) => arabicUtils.toLatinScript(text);
export const toEasternNumerals = (text: string) => arabicUtils.toEasternArabicNumerals(text);
export const toWesternNumerals = (text: string) => arabicUtils.toWesternNumerals(text);
export const getTextDirection = (text: string) => arabicUtils.getTextDirection(text);
export const validateArabicText = (text: string) => arabicUtils.validateArabicText(text);

// ============================================
// Usage Examples
// ============================================

export const ARABIC_TEXT_EXAMPLES = `
📝 استخدام أدوات النصوص العربية / Arabic Text Utils Usage

// 1. كشف اللغة العربية
isArabic('مرحبا');  // true
isArabic('Hello');  // false

// 2. تطبيع النص
normalize('مَرْحَباً بِكَ');  // 'مرحبا بك'

// 3. إزالة التشكيل
removeDiacritics('مَرْحَباً');  // 'مرحبا'

// 4. تحويل إلى حروف لاتينية
toLatinScript('محمد');  // 'mhmd'

// 5. تحويل الأرقام
toEasternNumerals('123');  // '١٢٣'
toWesternNumerals('٤٥٦');  // '456'

// 6. كشف اتجاه النص
getTextDirection('مرحبا');  // 'rtl'
getTextDirection('Hello');  // 'ltr'

// 7. التحقق من صحة النص
validateArabicText('مرحبا بك في عقول');
// {
//   isValid: true,
//   hasArabic: true,
//   hasDiacritics: false,
//   arabicPercentage: 100,
//   wordCount: 4
// }

// 8. استخراج الكلمات العربية
const utils = createArabicTextUtils();
utils.extractArabicWords('Hello مرحبا World بك');  // ['مرحبا', 'بك']

// 9. تنسيق للعرض
utils.formatForDisplay('مرحبا');
// {
//   text: '‏مرحبا‏',
//   direction: 'rtl',
//   lang: 'ar'
// }
`;

// Export all
export default ArabicTextUtils;
