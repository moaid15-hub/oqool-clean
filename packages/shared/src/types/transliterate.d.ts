// Type definitions for transliterate package
declare module 'transliterate' {
  export interface TransliterateOptions {
    unknown?: string;
    replace?: Record<string, string>;
    replaceAfter?: Record<string, string>;
    ignore?: string[];
  }

  export function transliterate(text: string, options?: TransliterateOptions): string;
}
