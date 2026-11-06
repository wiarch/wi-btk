export type Feature = {
  icon: string;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    icon: '🧩',
    title: 'Suite modular',
    description:
      'Instala solo el núcleo y añade herramientas desde un catálogo integrado cuando estén disponibles. Cada módulo podrá actualizarse o desinstalarse por separado.',
  },
  {
    icon: '📷',
    title: 'WI-Rec · Captura y grabación',
    description:
      'Capturas de pantalla, anotaciones, grabación, cámara superpuesta y selector de color en un módulo dedicado.',
  },
  {
    icon: '⌨️',
    title: 'Automatización',
    description:
      'Herramientas como autoclicker, botones y utilidades de automatización, con compatibilidad declarada por plataforma.',
  },
  {
    icon: '⚙️',
    title: 'Sistema y dispositivos',
    description:
      'Módulos de control del sistema, dispositivos, brillo y widgets. Algunas operaciones avanzadas son específicas de Windows.',
  },
  {
    icon: '📝',
    title: 'Productividad y utilidades',
    description:
      'Notas, calculadora, reloj, dibujo, visor multimedia, traducción, clima y utilidades de red.',
  },
  {
    icon: '🐧',
    title: 'Windows y Linux',
    description:
      'Distribuciones para ambos sistemas. Cada módulo indica su compatibilidad real con Windows, Linux, X11 y Wayland.',
  },
];

export const hotkeys = [
  { action: 'Captura región (WI-Rec)', keys: 'Alt+Shift+S' },
  { action: 'Grabación (WI-Rec)', keys: 'Alt+Shift+R' },
  { action: 'Iniciar grabación', keys: 'Enter' },
  { action: 'Pausar / reanudar', keys: 'F2' },
  { action: 'Detener grabación', keys: 'F3' },
];

export const meta = {
  name: 'WI-BTK',
  version: '1.0.0',
  license: 'MIT',
  repo: 'https://github.com/wiarch/wi-btk',
  author: 'WI Arch',
  authorUrl: 'https://wiarch.com/',
  tagline: 'Una suite modular de herramientas de escritorio para Windows y Linux.',
};
