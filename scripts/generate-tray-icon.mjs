import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets');
const outPath = join(outDir, 'tray-icon.png');

const py = `
from PIL import Image, ImageDraw

size = 64
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

blue = (79, 109, 245, 255)
white = (255, 255, 255, 255)

pad = 6
draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=12, fill=blue)

stroke = 3
inner = 16
outer = 28
corners = (
    (inner, inner, 1, 1),
    (size - outer, inner, -1, 1),
    (inner, size - outer, 1, -1),
    (size - outer, size - outer, -1, -1),
)
for x0, y0, dx, dy in corners:
    draw.line((x0, y0, x0 + (outer - inner) * dx, y0), fill=white, width=stroke)
    draw.line((x0, y0, x0, y0 + (outer - inner) * dy), fill=white, width=stroke)

cx, cy = size // 2, size // 2
draw.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=white)

img.save(${JSON.stringify(outPath)}, format="PNG")
`;

mkdirSync(outDir, { recursive: true });

const result = spawnSync('python3', ['-c', py], { encoding: 'utf8' });

const FALLBACK_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABVklEQVR4nO2bQQ7CIBREv8aVHk4voofRi+jhdKsbSUxD4VPoH77M27bFmWEotlERQggh47Kpufh4fr5bCanlcTss8rLoop6MTykNoujkno1P0Qax1Q7oybyIXq8qAG/mAxrd2QC8mg/k9KuXwL+SDMD77AdSPoZvwOxWoZ39+3XfTs2X0+XVfEyR+NZY1YA1zK85bozhl8Cu1UAtams584HhG8AA0ALQMAC0ADTDB9BsGywFseXFMA+gF+MB0yXQm3kRwwBKzVuFNfxN0CSApbNp0QI2AC0ADQNAC0DT7IuQp3eDvwzfgKoA1pwhi9kXabAESoVqloqVeRHAw1AwFwvC0ngA9jiMMBuDN0G0ADQMAC0ADQNAC0DDANAC0DCAuQNLf3vbK3N+2IDUwX9pQcoHG5A7wXsLcvpVDfAagka3egl4C0Grl/8YqfmwnoLw1lBCCOmCD7LSXkP+P4AJAAAAAElFTkSuQmCC';

if (result.status !== 0) {
  writeFileSync(outPath, Buffer.from(FALLBACK_BASE64, 'base64'));
  console.warn('PIL unavailable, wrote embedded tray icon fallback');
}

console.log(`Generated tray icon at ${outPath}`);
