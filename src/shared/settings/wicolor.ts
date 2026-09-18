export type WicolorSavedColor = {
  id: string;
  hex: string;
  name: string;
};

export type WicolorPalette = {
  id: string;
  name: string;
  colors: WicolorSavedColor[];
};

export type WicolorSettings = {
  lastHex: string;
  activePaletteId: string;
  palettes: WicolorPalette[];
};

export const WICOLOR_APP_ID = 'wicolor';

export const DEFAULT_WICOLOR_SETTINGS: WicolorSettings = {
  lastHex: '#E5E9F0',
  activePaletteId: 'pastel',
  palettes: [
    {
      id: 'pastel',
      name: 'Pastel',
      colors: [
        { id: 'c1', hex: '#FFADAD', name: '' },
        { id: 'c2', hex: '#FFD6A5', name: '' },
        { id: 'c3', hex: '#FDFFB6', name: '' },
        { id: 'c4', hex: '#CAFFBF', name: '' },
        { id: 'c5', hex: '#9BF6FF', name: '' },
        { id: 'c6', hex: '#A0C4FF', name: '' },
        { id: 'c7', hex: '#BDB2FF', name: '' },
        { id: 'c8', hex: '#FFC6FF', name: '' },
      ],
    },
    {
      id: 'colors',
      name: 'Colors',
      colors: [
        { id: 'd1', hex: '#EF4444', name: '' },
        { id: 'd2', hex: '#F97316', name: '' },
        { id: 'd3', hex: '#EAB308', name: '' },
        { id: 'd4', hex: '#22C55E', name: '' },
        { id: 'd5', hex: '#06B6D4', name: '' },
        { id: 'd6', hex: '#3B82F6', name: '' },
        { id: 'd7', hex: '#8B5CF6', name: '' },
        { id: 'd8', hex: '#EC4899', name: '' },
      ],
    },
  ],
};

export function createColorId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function mergeWicolorSettings(partial?: Partial<WicolorSettings> | null): WicolorSettings {
  const base: WicolorSettings = {
    lastHex: DEFAULT_WICOLOR_SETTINGS.lastHex,
    activePaletteId: DEFAULT_WICOLOR_SETTINGS.activePaletteId,
    palettes: DEFAULT_WICOLOR_SETTINGS.palettes.map((palette) => ({
      ...palette,
      colors: palette.colors.map((color) => ({ ...color })),
    })),
  };

  if (!partial) {
    return base;
  }

  const lastHex = normalizeHex(String(partial.lastHex ?? base.lastHex)) ?? base.lastHex;
  const palettes = Array.isArray(partial.palettes) && partial.palettes.length > 0
    ? partial.palettes.map(mergePalette).filter((item): item is WicolorPalette => Boolean(item))
    : base.palettes;

  const activePaletteId = String(partial.activePaletteId ?? base.activePaletteId);
  const hasActive = palettes.some((palette) => palette.id === activePaletteId);

  return {
    lastHex,
    activePaletteId: hasActive ? activePaletteId : palettes[0]?.id ?? base.activePaletteId,
    palettes: palettes.length ? palettes : base.palettes,
  };
}

function mergePalette(raw: unknown): WicolorPalette | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as Partial<WicolorPalette>;
  const id = String(item.id ?? '').trim() || createColorId();
  const name = String(item.name ?? 'Palette').trim() || 'Palette';
  const colors = Array.isArray(item.colors)
    ? item.colors
        .map((color) => {
          if (!color || typeof color !== 'object') {
            return null;
          }
          const entry = color as Partial<WicolorSavedColor>;
          const hex = normalizeHex(String(entry.hex ?? ''));
          if (!hex) {
            return null;
          }
          return {
            id: String(entry.id ?? '').trim() || createColorId(),
            hex,
            name: String(entry.name ?? '').trim(),
          };
        })
        .filter((color): color is WicolorSavedColor => Boolean(color))
    : [];

  return { id, name, colors };
}

function normalizeHex(value: string): string | null {
  let hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return `#${hex.toUpperCase()}`;
}
