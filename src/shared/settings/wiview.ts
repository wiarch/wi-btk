export type WiviewRecentItem = {
  path: string;
  name: string;
  kind: 'image' | 'video' | 'audio';
  openedAt: number;
};

export type WiviewSettings = {
  hotkey: string;
  hotkeyEnabled: boolean;
  recent: WiviewRecentItem[];
  volume: number;
  lastFolder: string;
};

export const DEFAULT_WIVIEW_SETTINGS: WiviewSettings = {
  hotkey: 'Alt+Shift+W',
  hotkeyEnabled: true,
  recent: [],
  volume: 0.85,
  lastFolder: '',
};

export const WIVIEW_APP_ID = 'wiview';

export const WIVIEW_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.ico'];
export const WIVIEW_VIDEO_EXTS = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v'];
export const WIVIEW_AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'];

export function detectMediaKind(filePath: string): WiviewRecentItem['kind'] | null {
  const lower = filePath.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  if (WIVIEW_IMAGE_EXTS.includes(ext)) return 'image';
  if (WIVIEW_VIDEO_EXTS.includes(ext)) return 'video';
  if (WIVIEW_AUDIO_EXTS.includes(ext)) return 'audio';
  return null;
}

export function mergeWiviewSettings(partial?: Partial<WiviewSettings> | null): WiviewSettings {
  const base = { ...DEFAULT_WIVIEW_SETTINGS };
  if (!partial) {
    return { ...base, recent: [] };
  }

  const recent = Array.isArray(partial.recent)
    ? partial.recent
        .map((item) => {
          const path = String(item?.path || '').trim();
          const kind = detectMediaKind(path) ?? (item?.kind as WiviewRecentItem['kind']);
          if (!path || (kind !== 'image' && kind !== 'video' && kind !== 'audio')) {
            return null;
          }
          const name =
            String(item?.name || '').trim() ||
            path.replace(/^.*[/\\]/, '') ||
            path;
          return {
            path,
            name,
            kind,
            openedAt: Number(item?.openedAt) || Date.now(),
          } satisfies WiviewRecentItem;
        })
        .filter((item): item is WiviewRecentItem => Boolean(item))
        .sort((a, b) => b.openedAt - a.openedAt)
        .slice(0, 40)
    : [];

  return {
    hotkey: String(partial.hotkey ?? base.hotkey).trim() || base.hotkey,
    hotkeyEnabled: partial.hotkeyEnabled ?? base.hotkeyEnabled,
    recent,
    volume: Math.min(1, Math.max(0, Number(partial.volume ?? base.volume))),
    lastFolder: String(partial.lastFolder ?? base.lastFolder),
  };
}
