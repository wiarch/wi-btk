export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };
export type Hsv = { h: number; s: number; v: number };

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
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
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      default:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hh = (((h % 360) + 360) % 360) / 60;
  const ss = clamp(s, 0, 100) / 100;
  const vv = clamp(v, 0, 100) / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = vv - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 1) [rp, gp, bp] = [c, x, 0];
  else if (hh < 2) [rp, gp, bp] = [x, c, 0];
  else if (hh < 3) [rp, gp, bp] = [0, c, x];
  else if (hh < 4) [rp, gp, bp] = [0, x, c];
  else if (hh < 5) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255),
  };
}

/** Three tint levels inspired by colorpicker.fr (HSL lighten/darken). */
export function buildTintLevels(rgb: Rgb): Rgb[][] {
  const hsl = rgbToHsl(rgb);
  const levels = [
    [-28, -14, 0, 14, 28],
    [-40, -20, 0, 20, 40],
    [-52, -26, 0, 26, 52],
  ];
  return levels.map((offsets) =>
    offsets.map((offset) =>
      hslToRgb({
        h: hsl.h,
        s: hsl.s,
        l: clamp(hsl.l + offset, 4, 96),
      }),
    ),
  );
}
