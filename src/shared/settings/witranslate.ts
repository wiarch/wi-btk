export type TranslateLang = 'es' | 'en' | 'pt';

export type WitranslateSettings = {
  sourceLang: TranslateLang | 'auto';
  targetLang: TranslateLang;
  lastSourceText: string;
  lastTranslatedText: string;
};

export const TRANSLATE_LANGS: TranslateLang[] = ['es', 'en', 'pt'];

export const TRANSLATE_LANG_LABELS: Record<TranslateLang, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

export const DEFAULT_WITRANSLATE_SETTINGS: WitranslateSettings = {
  sourceLang: 'auto',
  targetLang: 'en',
  lastSourceText: '',
  lastTranslatedText: '',
};

export const WITRANSLATE_APP_ID = 'witranslate';

export function isTranslateLang(value: unknown): value is TranslateLang {
  return value === 'es' || value === 'en' || value === 'pt';
}

export function mergeWitranslateSettings(
  partial?: Partial<WitranslateSettings> | null,
): WitranslateSettings {
  const base = { ...DEFAULT_WITRANSLATE_SETTINGS };
  if (!partial) {
    return base;
  }
  const sourceLang =
    partial.sourceLang === 'auto' || isTranslateLang(partial.sourceLang)
      ? partial.sourceLang
      : base.sourceLang;
  const targetLang = isTranslateLang(partial.targetLang) ? partial.targetLang : base.targetLang;
  return {
    sourceLang,
    targetLang: sourceLang !== 'auto' && sourceLang === targetLang
      ? (TRANSLATE_LANGS.find((l) => l !== targetLang) ?? 'en')
      : targetLang,
    lastSourceText: String(partial.lastSourceText ?? base.lastSourceText).slice(0, 20_000),
    lastTranslatedText: String(partial.lastTranslatedText ?? base.lastTranslatedText).slice(0, 20_000),
  };
}
