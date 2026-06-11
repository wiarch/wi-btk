export type Feature = {
  icon: string;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    icon: '📷',
    title: 'Captura de región',
    description:
      'Atajo global, congela la pantalla y selecciona la zona. Guarda, copia o anota con flechas y rectángulos.',
  },
  {
    icon: '🎥',
    title: 'Grabación de pantalla',
    description:
      'Región o pantalla completa con audio del sistema y micrófono. Cuenta atrás, pausa, reanuda y controles minimizables.',
  },
  {
    icon: '🎨',
    title: 'Selector de color',
    description:
      'Cuentagotas con HSV, armonías, variaciones, contraste WCAG y biblioteca de colores con nombre.',
  },
  {
    icon: '⌨️',
    title: 'Atajos globales',
    description:
      'Captura, grabación, color, guardar, copiar y cancelar — todos personalizables desde ajustes.',
  },
  {
    icon: '🔔',
    title: 'Bandeja y sonidos',
    description:
      'Icono en bandeja del sistema, notificaciones nativas y sonidos al capturar o grabar.',
  },
  {
    icon: '⚙️',
    title: 'Ajustes completos',
    description:
      'Idioma ES/EN, autostart, carpeta de guardado, JPEG, WebM VP8/VP9, calidad, FPS y nombres de archivo.',
  },
];

export const hotkeys = [
  { action: 'Captura región', keys: 'Alt+Shift+S' },
  { action: 'Grabación', keys: 'Alt+Shift+R' },
  { action: 'Iniciar grabación', keys: 'Enter' },
  { action: 'Pausar / reanudar', keys: 'F2' },
  { action: 'Detener grabación', keys: 'F3' },
];

export const meta = {
  name: 'WI-Rec',
  version: '1.0.0',
  license: 'MIT',
  repo: 'https://github.com/wiarch/wi-rec',
  author: 'Wi Arch',
  authorUrl: 'https://wiarch.williamache.dev/',
  tagline: 'Captura y graba tu pantalla en Windows y Linux.',
};
