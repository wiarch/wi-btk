import type { Rgb } from './colorPickerMath.js';

export type ColorCategory =
  | 'all'
  | 'red'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'brown'
  | 'white'
  | 'gray';

export const COLOR_CATEGORIES: ColorCategory[] = [
  'all', 'red', 'pink', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown', 'white', 'gray',
];

export type NamedColor = {
  name: string;
  hex: string;
  rgb: Rgb;
  category: Exclude<ColorCategory, 'all'>;
};

export type ColorNameMatch = {
  name: string;
  rgb: Rgb;
  hex: string;
  exact: boolean;
  distance: number;
};

const CSS_COLOR_HEX: Record<string, string> = {
  "AliceBlue": "#F0F8FF",
  "AntiqueWhite": "#FAEBD7",
  "Aqua": "#00FFFF",
  "Aquamarine": "#7FFFD4",
  "Azure": "#F0FFFF",
  "Beige": "#F5F5DC",
  "Bisque": "#FFE4C4",
  "Black": "#000000",
  "BlanchedAlmond": "#FFEBCD",
  "Blue": "#0000FF",
  "BlueViolet": "#8A2BE2",
  "Brown": "#A52A2A",
  "BurlyWood": "#DEB887",
  "CadetBlue": "#5F9EA0",
  "Chartreuse": "#7FFF00",
  "Chocolate": "#D2691E",
  "Coral": "#FF7F50",
  "CornflowerBlue": "#6495ED",
  "Cornsilk": "#FFF8DC",
  "Crimson": "#DC143C",
  "Cyan": "#00FFFF",
  "DarkBlue": "#00008B",
  "DarkCyan": "#008B8B",
  "DarkGoldenRod": "#B8860B",
  "DarkGray": "#A9A9A9",
  "DarkGreen": "#006400",
  "DarkKhaki": "#BDB76B",
  "DarkMagenta": "#8B008B",
  "DarkOliveGreen": "#556B2F",
  "DarkOrange": "#FF8C00",
  "DarkOrchid": "#9932CC",
  "DarkRed": "#8B0000",
  "DarkSalmon": "#E9967A",
  "DarkSeaGreen": "#8FBC8F",
  "DarkSlateBlue": "#483D8B",
  "DarkSlateGray": "#2F4F4F",
  "DarkTurquoise": "#00CED1",
  "DarkViolet": "#9400D3",
  "DeepPink": "#FF1493",
  "DeepSkyBlue": "#00BFFF",
  "DimGray": "#696969",
  "DodgerBlue": "#1E90FF",
  "FireBrick": "#B22222",
  "FloralWhite": "#FFFAF0",
  "ForestGreen": "#228B22",
  "Fuchsia": "#FF00FF",
  "Gainsboro": "#DCDCDC",
  "GhostWhite": "#F8F8FF",
  "Gold": "#FFD700",
  "GoldenRod": "#DAA520",
  "Gray": "#808080",
  "Green": "#008000",
  "GreenYellow": "#ADFF2F",
  "HoneyDew": "#F0FFF0",
  "HotPink": "#FF69B4",
  "IndianRed": "#CD5C5C",
  "Indigo": "#4B0082",
  "Ivory": "#FFFFF0",
  "Khaki": "#F0E68C",
  "Lavender": "#E6E6FA",
  "LavenderBlush": "#FFF0F5",
  "LawnGreen": "#7CFC00",
  "LemonChiffon": "#FFFACD",
  "LightBlue": "#ADD8E6",
  "LightCoral": "#F08080",
  "LightCyan": "#E0FFFF",
  "LightGoldenRodYellow": "#FAFAD2",
  "LightGray": "#D3D3D3",
  "LightGreen": "#90EE90",
  "LightPink": "#FFB6C1",
  "LightSalmon": "#FFA07A",
  "LightSeaGreen": "#20B2AA",
  "LightSkyBlue": "#87CEFA",
  "LightSlateGray": "#778899",
  "LightSteelBlue": "#B0C4DE",
  "LightYellow": "#FFFFE0",
  "Lime": "#00FF00",
  "LimeGreen": "#32CD32",
  "Linen": "#FAF0E6",
  "Magenta": "#FF00FF",
  "Maroon": "#800000",
  "MediumAquaMarine": "#66CDAA",
  "MediumBlue": "#0000CD",
  "MediumOrchid": "#BA55D3",
  "MediumPurple": "#9370DB",
  "MediumSeaGreen": "#3CB371",
  "MediumSlateBlue": "#7B68EE",
  "MediumSpringGreen": "#00FA9A",
  "MediumTurquoise": "#48D1CC",
  "MediumVioletRed": "#C71585",
  "MidnightBlue": "#191970",
  "MintCream": "#F5FFFA",
  "MistyRose": "#FFE4E1",
  "Moccasin": "#FFE4B5",
  "NavajoWhite": "#FFDEAD",
  "Navy": "#000080",
  "OldLace": "#FDF5E6",
  "Olive": "#808000",
  "OliveDrab": "#6B8E23",
  "Orange": "#FFA500",
  "OrangeRed": "#FF4500",
  "Orchid": "#DA70D6",
  "PaleGoldenRod": "#EEE8AA",
  "PaleGreen": "#98FB98",
  "PaleTurquoise": "#AFEEEE",
  "PaleVioletRed": "#DB7093",
  "PapayaWhip": "#FFEFD5",
  "PeachPuff": "#FFDAB9",
  "Peru": "#CD853F",
  "Pink": "#FFC0CB",
  "Plum": "#DDA0DD",
  "PowderBlue": "#B0E0E6",
  "Purple": "#800080",
  "RebeccaPurple": "#663399",
  "Red": "#FF0000",
  "RosyBrown": "#BC8F8F",
  "RoyalBlue": "#4169E1",
  "SaddleBrown": "#8B4513",
  "Salmon": "#FA8072",
  "SandyBrown": "#F4A460",
  "SeaGreen": "#2E8B57",
  "SeaShell": "#FFF5EE",
  "Sienna": "#A0522D",
  "Silver": "#C0C0C0",
  "SkyBlue": "#87CEEB",
  "SlateBlue": "#6A5ACD",
  "SlateGray": "#708090",
  "Snow": "#FFFAFA",
  "SpringGreen": "#00FF7F",
  "SteelBlue": "#4682B4",
  "Tan": "#D2B48C",
  "Teal": "#008080",
  "Thistle": "#D8BFD8",
  "Tomato": "#FF6347",
  "Turquoise": "#40E0D0",
  "Violet": "#EE82EE",
  "Wheat": "#F5DEB3",
  "White": "#FFFFFF",
  "WhiteSmoke": "#F5F5F5",
  "Yellow": "#FFFF00",
  "YellowGreen": "#9ACD32"
};

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function hexToRgbLocal(hex: string): Rgb | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return null;
  const n = Number.parseInt(clean, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHslLocal({ r, g, b }: Rgb) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function inferCategory(rgb: Rgb): Exclude<ColorCategory, 'all'> {
  const { h, s, l } = rgbToHslLocal(rgb);
  if (l >= 88 && s <= 22) return 'white';
  if (l <= 12 || (s <= 10 && l < 80)) return 'gray';
  if (s <= 14 && l > 65) return 'white';
  if (s <= 16) return 'gray';
  if (h < 15 || h >= 350) return 'red';
  if (h < 30) return l < 42 ? 'brown' : 'orange';
  if (h < 45) return l < 38 && s < 70 ? 'brown' : 'orange';
  if (h < 68) return l < 40 && s < 75 ? 'brown' : 'yellow';
  if (h < 155) return 'green';
  if (h < 205) return 'blue';
  if (h < 265) return 'blue';
  if (h < 295) return 'purple';
  if (h < 330) return 'pink';
  return 'red';
}

export const NAMED_COLOR_LIBRARY: NamedColor[] = Object.entries(CSS_COLOR_HEX)
  .map(([name, hex]) => {
    const rgb = hexToRgbLocal(hex);
    if (!rgb) throw new Error(`Invalid color ${name}`);
    return { name, hex, rgb, category: inferCategory(rgb) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const HEX_LOOKUP = new Map<string, NamedColor>();
for (const entry of NAMED_COLOR_LIBRARY) {
  HEX_LOOKUP.set(entry.hex.toUpperCase(), entry);
}

export function findNamedColor(hex: string): NamedColor | null {
  const normalized = hex.startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
  return HEX_LOOKUP.get(normalized) ?? null;
}

export function resolveColorName(color: Rgb, hex: string): ColorNameMatch {
  const exact = findNamedColor(hex);
  if (exact) {
    return { name: exact.name, rgb: exact.rgb, hex: exact.hex, exact: true, distance: 0 };
  }

  let best = NAMED_COLOR_LIBRARY[0];
  let bestDistance = colorDistance(color, best.rgb);
  for (const entry of NAMED_COLOR_LIBRARY) {
    const distance = colorDistance(color, entry.rgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
    }
  }

  return {
    name: best.name,
    rgb: best.rgb,
    hex: best.hex,
    exact: bestDistance < 2,
    distance: bestDistance,
  };
}

export function findSimilarNamedColors(color: Rgb, count = 4): NamedColor[] {
  return [...NAMED_COLOR_LIBRARY]
    .map((entry) => ({ entry, distance: colorDistance(color, entry.rgb) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(({ entry }) => entry);
}

export function searchNamedColors(
  query: string,
  category: ColorCategory = 'all',
  limit = 80,
): NamedColor[] {
  const q = query.trim().toLowerCase();
  const filtered = NAMED_COLOR_LIBRARY.filter((entry) => {
    if (category !== 'all' && entry.category !== category) return false;
    if (!q) return true;
    const hex = entry.hex.slice(1).toLowerCase();
    const rgb = `${entry.rgb.r}, ${entry.rgb.g}, ${entry.rgb.b}`;
    return (
      entry.name.toLowerCase().includes(q) ||
      hex.includes(q.replace('#', '')) ||
      entry.hex.toLowerCase().includes(q) ||
      rgb.includes(q)
    );
  });
  return filtered.slice(0, limit);
}

export function findNamedColorByName(name: string): NamedColor | null {
  const q = name.trim().toLowerCase();
  return NAMED_COLOR_LIBRARY.find((entry) => entry.name.toLowerCase() === q) ?? null;
}
