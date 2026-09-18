export type CaptureCategory = 'rango' | 'edit' | 'completa' | 'grabacion' | 'voz' | 'loom';

export const CAPTURE_SUBFOLDERS: Record<CaptureCategory, string> = {
  rango: 'rango',
  edit: 'edit',
  completa: 'completa',
  grabacion: 'grabacion',
  voz: 'voz',
  loom: 'loom',
};
