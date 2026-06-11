export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };
export type Hsv = { h: number; s: number; v: number };

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): Rgb | null {
  let normalized = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    normalized = normalized
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const gray = clampByte(ln * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return {
    r: clampByte(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: clampByte(hueToRgb(p, q, hn) * 255),
    b: clampByte(hueToRgb(p, q, hn - 1 / 3) * 255),
  };
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  const s = max === 0 ? 0 : d / max;
  return { h: h * 360, s: s * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);

  let rn = 0;
  let gn = 0;
  let bn = 0;

  switch (i % 6) {
    case 0:
      rn = vn; gn = t; bn = p;
      break;
    case 1:
      rn = q; gn = vn; bn = p;
      break;
    case 2:
      rn = p; gn = vn; bn = t;
      break;
    case 3:
      rn = p; gn = q; bn = vn;
      break;
    case 4:
      rn = t; gn = p; bn = vn;
      break;
    default:
      rn = vn; gn = p; bn = q;
      break;
  }

  return {
    r: clampByte(rn * 255),
    g: clampByte(gn * 255),
    b: clampByte(bn * 255),
  };
}

export function rgbToCmyk({ r, g, b }: Rgb): { c: number; m: number; y: number; k: number } {
  if (r === 0 && g === 0 && b === 0) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = 1 - r / 255;
  const m = 1 - g / 255;
  const y = 1 - b / 255;
  const k = Math.min(c, m, y);

  return {
    c: ((c - k) / (1 - k)) * 100,
    m: ((m - k) / (1 - k)) * 100,
    y: ((y - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

export function cmykToRgb(c: number, m: number, y: number, k: number): Rgb {
  const cn = clamp(c, 0, 100) / 100;
  const mn = clamp(m, 0, 100) / 100;
  const yn = clamp(y, 0, 100) / 100;
  const kn = clamp(k, 0, 100) / 100;

  return {
    r: clampByte(255 * (1 - cn) * (1 - kn)),
    g: clampByte(255 * (1 - mn) * (1 - kn)),
    b: clampByte(255 * (1 - yn) * (1 - kn)),
  };
}

export function formatRgb(color: Rgb): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

export function formatCmyk(color: Rgb): string {
  const { c, m, y, k } = rgbToCmyk(color);
  return `${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%`;
}

export function formatHsv(color: Rgb): string {
  const { h, s, v } = rgbToHsv(color);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(v)}%`;
}

export function formatHsl(color: Rgb): string {
  const { h, s, l } = rgbToHsl(color);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`;
}

export function rgbToXyz(color: Rgb): { x: number; y: number; z: number } {
  let r = color.r / 255;
  let g = color.g / 255;
  let b = color.b / 255;

  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;

  return {
    x: (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100,
    y: (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100,
    z: (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100,
  };
}

export function rgbToLab(color: Rgb): { l: number; a: number; b: number } {
  const { x, y, z } = rgbToXyz(color);
  let xr = x / 95.047;
  let yr = y / 100;
  let zr = z / 108.883;

  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);

  xr = f(xr);
  yr = f(yr);
  zr = f(zr);

  return {
    l: 116 * yr - 16,
    a: 500 * (xr - yr),
    b: 200 * (yr - zr),
  };
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const convert = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastResult = {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
};

export function wcagContrast(foreground: Rgb, background: Rgb): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const ratio = clamp(t, 0, 1);
  return {
    r: clampByte(a.r + (b.r - a.r) * ratio),
    g: clampByte(a.g + (b.g - a.g) * ratio),
    b: clampByte(a.b + (b.b - a.b) * ratio),
  };
}

function hueShift(h: number, delta: number): number {
  return (((h + delta) % 360) + 360) % 360;
}

export type HarmonyType =
  | 'analogous'
  | 'complementary'
  | 'doubleSplitComplementary'
  | 'rectangle'
  | 'splitComplementary'
  | 'tetradic'
  | 'triadic';

export const HARMONY_TYPES: HarmonyType[] = [
  'analogous',
  'complementary',
  'doubleSplitComplementary',
  'rectangle',
  'splitComplementary',
  'tetradic',
  'triadic',
];

export function buildHarmony(type: HarmonyType, base: Rgb): Rgb[] {
  const { h, s, l } = rgbToHsl(base);
  const mk = (hue: number, sat = s, light = l) =>
    hslToRgb({ h: hueShift(hue, 0), s: sat, l: light });

  switch (type) {
    case 'analogous':
      return [mk(h - 30), mk(h), mk(h + 30)];
    case 'complementary':
      return [mk(h), mk(h + 180)];
    case 'splitComplementary':
      return [mk(h), mk(h + 150), mk(h + 210)];
    case 'doubleSplitComplementary':
      return [mk(h), mk(h + 150), mk(h + 180), mk(h + 210), mk(h + 330)];
    case 'rectangle':
      return [mk(h), mk(h + 60), mk(h + 180), mk(h + 240)];
    case 'tetradic':
      return [mk(h), mk(h + 90), mk(h + 180), mk(h + 270)];
    case 'triadic':
      return [mk(h), mk(h + 120), mk(h + 240)];
    default:
      return [mk(h)];
  }
}

export type VariationRow = { label: string; colors: Rgb[] };

export function buildVariationStrip(base: Rgb, steps = 11): Rgb[] {
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };

  return Array.from({ length: steps }, (_, index) => {
    const t = index / (steps - 1);
    if (t <= 0.5) {
      return mixRgb(white, base, t * 2);
    }
    return mixRgb(base, black, (t - 0.5) * 2);
  });
}

export function closestColorIndex(colors: Rgb[], target: Rgb): number {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (const [index, color] of colors.entries()) {
    const distance = colorDistance(color, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function buildVariations(base: Rgb): VariationRow[] {
  const { h, s, v } = rgbToHsv(base);
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };

  const saturation = [0, 25, 50, 75, 100].map((amount) =>
    hsvToRgb({ h, s: amount, v }),
  );

  const brightness = [20, 40, 60, 80, 100].map((amount) =>
    hsvToRgb({ h, s, v: amount }),
  );

  const tints = [0, 0.25, 0.5, 0.75, 1].map((t) => mixRgb(base, white, t));
  const shades = [0, 0.25, 0.5, 0.75, 1].map((t) => mixRgb(base, black, t));

  return [
    { label: 'saturation', colors: saturation },
    { label: 'brightness', colors: brightness },
    { label: 'tints', colors: tints },
    { label: 'shades', colors: shades },
  ];
}

const NAMED_COLORS: { name: string; rgb: Rgb }[] = [
  { name: 'Black', rgb: { r: 0, g: 0, b: 0 } },
  { name: 'White', rgb: { r: 255, g: 255, b: 255 } },
  { name: 'Red', rgb: { r: 255, g: 0, b: 0 } },
  { name: 'Lime', rgb: { r: 0, g: 255, b: 0 } },
  { name: 'Blue', rgb: { r: 0, g: 0, b: 255 } },
  { name: 'Yellow', rgb: { r: 255, g: 255, b: 0 } },
  { name: 'Cyan', rgb: { r: 0, g: 255, b: 255 } },
  { name: 'Magenta', rgb: { r: 255, g: 0, b: 255 } },
  { name: 'Orange', rgb: { r: 255, g: 165, b: 0 } },
  { name: 'Purple', rgb: { r: 128, g: 0, b: 128 } },
  { name: 'Pink', rgb: { r: 255, g: 192, b: 203 } },
  { name: 'Brown', rgb: { r: 165, g: 42, b: 42 } },
  { name: 'Gray', rgb: { r: 128, g: 128, b: 128 } },
  { name: 'Navy', rgb: { r: 0, g: 0, b: 128 } },
  { name: 'Teal', rgb: { r: 0, g: 128, b: 128 } },
  { name: 'Olive', rgb: { r: 128, g: 128, b: 0 } },
  { name: 'Maroon', rgb: { r: 128, g: 0, b: 0 } },
  { name: 'Silver', rgb: { r: 192, g: 192, b: 192 } },
  { name: 'Gold', rgb: { r: 255, g: 215, b: 0 } },
  { name: 'Coral', rgb: { r: 255, g: 127, b: 80 } },
  { name: 'Salmon', rgb: { r: 250, g: 128, b: 114 } },
  { name: 'Khaki', rgb: { r: 240, g: 230, b: 140 } },
  { name: 'Violet', rgb: { r: 238, g: 130, b: 238 } },
  { name: 'Indigo', rgb: { r: 75, g: 0, b: 130 } },
  { name: 'Crimson', rgb: { r: 220, g: 20, b: 60 } },
  { name: 'Turquoise', rgb: { r: 64, g: 224, b: 208 } },
  { name: 'Sky Blue', rgb: { r: 135, g: 206, b: 235 } },
  { name: 'Royal Blue', rgb: { r: 65, g: 105, b: 225 } },
  { name: 'Midnight Blue', rgb: { r: 25, g: 25, b: 112 } },
  { name: 'Forest Green', rgb: { r: 34, g: 139, b: 34 } },
  { name: 'Sea Green', rgb: { r: 46, g: 139, b: 87 } },
  { name: 'Lime Green', rgb: { r: 50, g: 205, b: 50 } },
  { name: 'Chartreuse', rgb: { r: 127, g: 255, b: 0 } },
  { name: 'Tomato', rgb: { r: 255, g: 99, b: 71 } },
  { name: 'Chocolate', rgb: { r: 210, g: 105, b: 30 } },
  { name: 'Sienna', rgb: { r: 160, g: 82, b: 45 } },
  { name: 'Slate Gray', rgb: { r: 112, g: 128, b: 144 } },
  { name: 'Steel Blue', rgb: { r: 70, g: 130, b: 180 } },
  { name: 'Dark Slate Blue', rgb: { r: 72, g: 61, b: 139 } },
  { name: 'Hot Pink', rgb: { r: 255, g: 105, b: 180 } },
  { name: 'Plum', rgb: { r: 221, g: 160, b: 221 } },
  { name: 'Orchid', rgb: { r: 218, g: 112, b: 214 } },
  { name: 'Beige', rgb: { r: 245, g: 245, b: 220 } },
  { name: 'Wheat', rgb: { r: 245, g: 222, b: 179 } },
  { name: 'Tan', rgb: { r: 210, g: 180, b: 140 } },
  { name: 'Peru', rgb: { r: 205, g: 133, b: 63 } },
  { name: 'Sandy Brown', rgb: { r: 244, g: 164, b: 96 } },
];

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export function findSimilarColors(base: Rgb, count = 4): { name: string; rgb: Rgb }[] {
  return [...NAMED_COLORS]
    .map((entry) => ({ ...entry, distance: colorDistance(base, entry.rgb) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ name, rgb }) => ({ name, rgb }));
}

export function parseNumbers(value: string): number[] {
  return value
    .replace(/[%°]/g, '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseFloat(part))
    .filter((num) => Number.isFinite(num));
}

export function parseRgb(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) return null;
  return { r: clampByte(nums[0]), g: clampByte(nums[1]), b: clampByte(nums[2]) };
}

export function parseCmyk(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 4) return null;
  return cmykToRgb(nums[0], nums[1], nums[2], nums[3]);
}

export function parseHsv(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) return null;
  return hsvToRgb({ h: nums[0], s: clamp(nums[1], 0, 100), v: clamp(nums[2], 0, 100) });
}

export function parseHsl(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) return null;
  return hslToRgb({ h: nums[0], s: clamp(nums[1], 0, 100), l: clamp(nums[2], 0, 100) });
}
