import {
  formatAcceleratorForDisplay,
  keyboardEventToAccelerator,
  previewAccelerator,
} from '../../../shared/hotkeyInput.js';
import { buildAcceleratorFromEvent, keyFromKeyboardEvent } from '../../../shared/accelerator.js';

export {};

type Language = 'en' | 'es';

type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'colorPicker'
  | 'colorPickerPanel'
  | 'screenRecord'
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel'
  | 'recordStart'
  | 'recordPause'
  | 'recordResume'
  | 'recordStop';

type RecordFormat = 'webm-vp9' | 'webm-vp8' | 'webm';
type RecordQuality = 'low' | 'medium' | 'high';
type RecordFrameRate = 15 | 30 | 60;

type FilenameMode = 'datetime' | 'sequential';
type FilenameDateStyle = 'iso' | 'latin';
type FilenameTimeStyle = 'h24' | 'h12';
type CaptureSoundPreset = 'chime' | 'pop' | 'shutter' | 'ding';

type AppSettings = {
  language: Language;
  launchAtStartup: boolean;
  sidebarIconsOnly: boolean;
  enabledApps: Record<string, boolean>;
  autoSaveCaptures: boolean;
  saveDirectory: string;
  useCaptureSubfolders: boolean;
  saveAsJpeg: boolean;
  jpegQuality: number;
  filenameMode: FilenameMode;
  filenameDateStyle: FilenameDateStyle;
  filenameTimeStyle: FilenameTimeStyle;
  captureSoundEnabled: boolean;
  captureSoundPreset: CaptureSoundPreset;
  recordFormat: RecordFormat;
  recordQuality: RecordQuality;
  recordFrameRate: RecordFrameRate;
  hotkeys: Record<HotkeyAction, string>;
};

type SettingsUi = {
  title: string;
  subtitle: string;
  shellBrand: string;
  shellTagline: string;
  searchPlaceholder: string;
  searchNoResults: string;
  compactSidebar: string;
  compactSidebarExpand: string;
  navHome: string;
  navWirec: string;
  navClick: string;
  navRemote: string;
  navBoard: string;
  navDraw: string;
  navButton: string;
  navBooster: string;
  navCalc: string;
  navClock: string;
  navNotes: string;
  navRate: string;
  navSystem: string;
  navDimmer: string;
  navTranslate: string;
  navNetest: string;
  navCam: string;
  navDevice: string;
  homeTitle: string;
  homeSubtitle: string;
  homeRecommended: string;
  homeRecommendedHint: string;
  moduleActive: string;
  moduleOff: string;
  moduleSoon: string;
  appEnable: string;
  descWirec: string;
  descClick: string;
  descRemote: string;
  descBoard: string;
  descDraw: string;
  descButton: string;
  descBooster: string;
  descCalc: string;
  descClock: string;
  descNotes: string;
  descRate: string;
  descSystem: string;
  descDimmer: string;
  descTranslate: string;
  descNetest: string;
  descCam: string;
  descDevice: string;
  soonTitle: string;
  soonBody: string;
  wirecSubtitle: string;
  captureSection: string;
  general: string;
  language: string;
  languageEn: string;
  languageEs: string;
  launchAtStartup: string;
  autoSaveCaptures: string;
  saveDirectory: string;
  browseSaveDirectory: string;
  useCaptureSubfolders: string;
  useCaptureSubfoldersHint: string;
  filenameSection: string;
  filenameMode: string;
  filenameModeDatetime: string;
  filenameModeSequential: string;
  filenameDateStyle: string;
  filenameDateIso: string;
  filenameDateLatin: string;
  filenameTimeStyle: string;
  filenameTime24: string;
  filenameTime12: string;
  filenamePreview: string;
  saveAsJpeg: string;
  jpegQuality: string;
  hotkeys: string;
  hotkeysHint: string;
  globalHotkeys: string;
  captureHotkeys: string;
  hotkeyCapture: string;
  hotkeyCaptureFullScreen: string;
  hotkeyColorPicker: string;
  hotkeyColorPickerPanel: string;
  hotkeyScreenRecord: string;
  hotkeyArrow: string;
  hotkeyRect: string;
  hotkeySave: string;
  hotkeyCopy: string;
  hotkeyCancel: string;
  hotkeyRecordStart: string;
  hotkeyRecordPause: string;
  hotkeyRecordResume: string;
  hotkeyRecordStop: string;
  recordingSection: string;
  recordFormat: string;
  recordFormatVp9: string;
  recordFormatVp8: string;
  recordFormatWebm: string;
  recordQuality: string;
  recordQualityLow: string;
  recordQualityMedium: string;
  recordQualityHigh: string;
  recordFrameRate: string;
  recordingHotkeys: string;
  pressKeys: string;
  notAssigned: string;
  save: string;
  cancel: string;
  close: string;
  saved: string;
  captureSound: string;
  captureSoundEnabled: string;
  captureSoundPreset: string;
  captureSoundChime: string;
  captureSoundPop: string;
  captureSoundShutter: string;
  captureSoundDing: string;
  hotkeyTooManyKeys: string;
};

type AssignHotkeyResult =
  | { ok: true; hotkeys: AppSettings['hotkeys'] }
  | { ok: false; reason: 'cancelled' | 'invalid' };

type WiRecSettingsApi = {
  getSettings(): Promise<AppSettings>;
  getUi(language: Language): Promise<SettingsUi>;
  assignHotkey(
    action: HotkeyAction,
    accelerator: string,
    hotkeys: AppSettings['hotkeys'],
    language: Language,
  ): Promise<AssignHotkeyResult>;
  saveSettings(settings: AppSettings): Promise<{ ok: true } | { ok: false; error: string }>;
  browseSaveDirectory(): Promise<string | null>;
  getResolvedSaveDirectory(): Promise<string>;
  previewFilename(settings: AppSettings): Promise<string>;
  previewCaptureSound(settings: AppSettings): Promise<void>;
  closeWindow(): void;
};

declare global {
  interface Window {
    wiRecSettings: WiRecSettingsApi;
  }
}

const GLOBAL_ACTIONS: HotkeyAction[] = [
  'capture',
  'captureFullScreen',
  'colorPicker',
  'colorPickerPanel',
  'screenRecord',
];
const OVERLAY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];
const RECORDING_ACTIONS: HotkeyAction[] = ['recordStart', 'recordPause', 'recordResume', 'recordStop'];

const HOTKEY_LABEL_KEYS: Record<HotkeyAction, keyof SettingsUi> = {
  capture: 'hotkeyCapture',
  captureFullScreen: 'hotkeyCaptureFullScreen',
  colorPicker: 'hotkeyColorPicker',
  colorPickerPanel: 'hotkeyColorPickerPanel',
  screenRecord: 'hotkeyScreenRecord',
  arrow: 'hotkeyArrow',
  rect: 'hotkeyRect',
  save: 'hotkeySave',
  copy: 'hotkeyCopy',
  cancel: 'hotkeyCancel',
  recordStart: 'hotkeyRecordStart',
  recordPause: 'hotkeyRecordPause',
  recordResume: 'hotkeyRecordResume',
  recordStop: 'hotkeyRecordStop',
};

const titleEl = document.getElementById('title') as HTMLHeadingElement;
const subtitleEl = document.getElementById('subtitle') as HTMLParagraphElement;
const shellBrandEl = document.getElementById('shell-brand') as HTMLElement;
const shellTaglineEl = document.getElementById('shell-tagline') as HTMLElement;
const shellSearchInput = document.getElementById('shell-search') as HTMLInputElement;
const searchEmptyEl = document.getElementById('search-empty') as HTMLParagraphElement;
const sidebarCompactToggle = document.getElementById('sidebar-compact-toggle') as HTMLButtonElement;
const sidebarCompactLabel = document.getElementById('sidebar-compact-label') as HTMLSpanElement;
const shellEl = document.querySelector('.shell') as HTMLElement;
const homeTitleEl = document.getElementById('home-title') as HTMLHeadingElement;
const homeSubtitleEl = document.getElementById('home-subtitle') as HTMLParagraphElement;
const homeRecommendedEl = document.getElementById('home-recommended') as HTMLHeadingElement;
const homeRecommendedHintEl = document.getElementById('home-recommended-hint') as HTMLParagraphElement;
const moduleActivePillEl = document.getElementById('module-active-pill') as HTMLSpanElement;
const descWirecEl = document.getElementById('desc-wirec') as HTMLElement;
const descClickEl = document.getElementById('desc-click') as HTMLElement;
const descRemoteEl = document.getElementById('desc-remote') as HTMLElement;
const descBoardEl = document.getElementById('desc-board') as HTMLElement | null;
const descDrawEl = document.getElementById('desc-draw') as HTMLElement | null;
const descButtonEl = document.getElementById('desc-button') as HTMLElement | null;
const descBoosterEl = document.getElementById('desc-booster') as HTMLElement | null;
const descCalcEl = document.getElementById('desc-calc') as HTMLElement | null;
const descClockEl = document.getElementById('desc-clock') as HTMLElement | null;
const descNotesEl = document.getElementById('desc-notes') as HTMLElement | null;
const descRateEl = document.getElementById('desc-rate') as HTMLElement | null;
const descSystemEl = document.getElementById('desc-system') as HTMLElement | null;
const descDimmerEl = document.getElementById('desc-dimmer') as HTMLElement | null;
const descTranslateEl = document.getElementById('desc-translate') as HTMLElement | null;
const descNetestEl = document.getElementById('desc-netest') as HTMLElement;
const descCamEl = document.getElementById('desc-cam') as HTMLElement | null;
const descDeviceEl = document.getElementById('desc-device') as HTMLElement;
const wirecSubtitleEl = document.getElementById('wirec-subtitle') as HTMLParagraphElement;
const captureSectionTitleEl = document.getElementById('capture-general-title') as HTMLHeadingElement;
const soonTitleEl = document.getElementById('soon-title') as HTMLHeadingElement;
const soonBodyEl = document.getElementById('soon-body') as HTMLParagraphElement;
const soonModuleNameEl = document.getElementById('soon-module-name') as HTMLHeadingElement;
const soonModuleDescEl = document.getElementById('soon-module-desc') as HTMLParagraphElement;
const shellNav = document.getElementById('shell-nav') as HTMLElement;
const panelHome = document.getElementById('panel-home') as HTMLElement;
const panelWirec = document.getElementById('panel-wirec') as HTMLElement;
const panelWiclick = document.getElementById('panel-wiclick') as HTMLElement;
const panelWibutton = document.getElementById('panel-wibutton') as HTMLElement;
const panelWibooster = document.getElementById('panel-wibooster') as HTMLElement;
const panelWicalc = document.getElementById('panel-wicalc') as HTMLElement;
const panelWiclock = document.getElementById('panel-wiclock') as HTMLElement;
const panelWinotes = document.getElementById('panel-winotes') as HTMLElement;
const panelWirate = document.getElementById('panel-wirate') as HTMLElement;
const panelWisystem = document.getElementById('panel-wisystem') as HTMLElement;
const panelWidimmer = document.getElementById('panel-widimmer') as HTMLElement;
const panelWitranslate = document.getElementById('panel-witranslate') as HTMLElement;
const panelWidraw = document.getElementById('panel-widraw') as HTMLElement;
const panelWinetest = document.getElementById('panel-winetest') as HTMLElement;
const panelWicam = document.getElementById('panel-wicam') as HTMLElement;
const panelWidevice = document.getElementById('panel-widevice') as HTMLElement;
const panelSoon = document.getElementById('panel-soon') as HTMLElement;
const generalTitleEl = document.getElementById('general-title') as HTMLHeadingElement;
const languageLabelEl = document.getElementById('language-label') as HTMLLabelElement;
const languageSelect = document.getElementById('language') as HTMLSelectElement;
const launchCheckbox = document.getElementById('launch-at-startup') as HTMLInputElement;
const launchLabelEl = document.getElementById('launch-label') as HTMLSpanElement;
const autoSaveCheckbox = document.getElementById('auto-save-captures') as HTMLInputElement;
const autoSaveLabelEl = document.getElementById('auto-save-label') as HTMLSpanElement;
const saveDirectoryLabelEl = document.getElementById('save-directory-label') as HTMLLabelElement;
const saveDirectoryInput = document.getElementById('save-directory') as HTMLInputElement;
const browseSaveDirectoryBtn = document.getElementById('browse-save-directory') as HTMLButtonElement;
const useSubfoldersCheckbox = document.getElementById('use-capture-subfolders') as HTMLInputElement;
const useSubfoldersLabelEl = document.getElementById('use-subfolders-label') as HTMLSpanElement;
const subfoldersHintEl = document.getElementById('subfolders-hint') as HTMLParagraphElement;
const filenameSectionTitleEl = document.getElementById('filename-section-title') as HTMLHeadingElement;
const filenameModeLabelEl = document.getElementById('filename-mode-label') as HTMLLabelElement;
const filenameModeSelect = document.getElementById('filename-mode') as HTMLSelectElement;
const filenameDateFieldEl = document.getElementById('filename-date-field') as HTMLDivElement;
const filenameDateLabelEl = document.getElementById('filename-date-label') as HTMLLabelElement;
const filenameDateStyleSelect = document.getElementById('filename-date-style') as HTMLSelectElement;
const filenameTimeFieldEl = document.getElementById('filename-time-field') as HTMLDivElement;
const filenameTimeLabelEl = document.getElementById('filename-time-label') as HTMLLabelElement;
const filenameTimeStyleSelect = document.getElementById('filename-time-style') as HTMLSelectElement;
const filenamePreviewLabelEl = document.getElementById('filename-preview-label') as HTMLParagraphElement;
const filenamePreviewEl = document.getElementById('filename-preview') as HTMLParagraphElement;
const saveAsJpegCheckbox = document.getElementById('save-as-jpeg') as HTMLInputElement;
const saveAsJpegLabelEl = document.getElementById('save-as-jpeg-label') as HTMLSpanElement;
const jpegQualityLabelEl = document.getElementById('jpeg-quality-label') as HTMLLabelElement;
const jpegQualityInput = document.getElementById('jpeg-quality') as HTMLInputElement;
const jpegQualityValueEl = document.getElementById('jpeg-quality-value') as HTMLSpanElement;
const hotkeysTitleEl = document.getElementById('hotkeys-title') as HTMLHeadingElement;
const hotkeysHintEl = document.getElementById('hotkeys-hint') as HTMLParagraphElement;
const globalHotkeysTitleEl = document.getElementById('global-hotkeys-title') as HTMLHeadingElement;
const captureHotkeysTitleEl = document.getElementById('capture-hotkeys-title') as HTMLHeadingElement;
const globalHotkeyGrid = document.getElementById('global-hotkey-grid') as HTMLDivElement;
const overlayHotkeyGrid = document.getElementById('overlay-hotkey-grid') as HTMLDivElement;
const recordingHotkeyGrid = document.getElementById('recording-hotkey-grid') as HTMLDivElement;
const recordingSectionTitleEl = document.getElementById('recording-section-title') as HTMLHeadingElement;
const recordFormatLabelEl = document.getElementById('record-format-label') as HTMLLabelElement;
const recordFormatSelect = document.getElementById('record-format') as HTMLSelectElement;
const recordQualityLabelEl = document.getElementById('record-quality-label') as HTMLLabelElement;
const recordQualitySelect = document.getElementById('record-quality') as HTMLSelectElement;
const recordFrameRateLabelEl = document.getElementById('record-frame-rate-label') as HTMLLabelElement;
const recordFrameRateSelect = document.getElementById('record-frame-rate') as HTMLSelectElement;
const recordingHotkeysTitleEl = document.getElementById('recording-hotkeys-title') as HTMLHeadingElement;
const captureSoundTitleEl = document.getElementById('capture-sound-title') as HTMLHeadingElement;
const captureSoundEnabledCheckbox = document.getElementById('capture-sound-enabled') as HTMLInputElement;
const captureSoundEnabledLabelEl = document.getElementById('capture-sound-enabled-label') as HTMLSpanElement;
const captureSoundPresetFieldEl = document.getElementById('capture-sound-preset-field') as HTMLDivElement;
const captureSoundPresetLabelEl = document.getElementById('capture-sound-preset-label') as HTMLLabelElement;
const captureSoundPresetSelect = document.getElementById('capture-sound-preset') as HTMLSelectElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

const CAPTURE_SOUND_PRESETS: CaptureSoundPreset[] = ['chime', 'pop', 'shutter', 'ding'];

const SOUND_LABEL_KEYS: Record<CaptureSoundPreset, keyof SettingsUi> = {
  chime: 'captureSoundChime',
  pop: 'captureSoundPop',
  shutter: 'captureSoundShutter',
  ding: 'captureSoundDing',
};

let draft: AppSettings | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let savedStatusTimer: ReturnType<typeof setTimeout> | null = null;
let ui: SettingsUi | null = null;
let recordingAction: HotkeyAction | null = null;
let recordingInput: HTMLInputElement | null = null;
let recordingListener: ((event: KeyboardEvent) => void) | null = null;
let recordingKeyupListener: ((event: KeyboardEvent) => void) | null = null;
const hotkeyInputs = new Map<HotkeyAction, HTMLInputElement>();

function setStatus(message: string, kind: 'ok' | 'error' | '' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` ${kind}` : ''}`;
}

function displayHotkeyValue(action: HotkeyAction): string {
  if (!draft || !ui) {
    return '';
  }

  const value = draft.hotkeys[action];
  if (!value) {
    return ui.notAssigned;
  }

  return formatAcceleratorForDisplay(value);
}

function refreshHotkeyInputs(): void {
  for (const [action, input] of hotkeyInputs) {
    input.value = displayHotkeyValue(action);
  }
}

function applyLanguage(): void {
  if (!draft || !ui) {
    return;
  }

  titleEl.textContent = ui.title;
  subtitleEl.textContent = ui.subtitle;
  shellBrandEl.textContent = ui.shellBrand;
  shellTaglineEl.textContent = ui.shellTagline;
  shellSearchInput.placeholder = ui.searchPlaceholder;
  searchEmptyEl.textContent = ui.searchNoResults;
  updateCompactToggleLabel();
  homeTitleEl.textContent = ui.homeTitle;
  homeSubtitleEl.textContent = ui.homeSubtitle;
  homeRecommendedEl.textContent = ui.homeRecommended;
  homeRecommendedHintEl.textContent = ui.homeRecommendedHint;
  moduleActivePillEl.textContent = ui.moduleActive;
  descWirecEl.textContent = ui.descWirec;
  descClickEl.textContent = ui.descClick;
  descRemoteEl.textContent = ui.descRemote;
  descBoardEl && (descBoardEl.textContent = ui.descBoard);
  descDrawEl && (descDrawEl.textContent = ui.descDraw);
  descButtonEl && (descButtonEl.textContent = ui.descButton);
  descBoosterEl && (descBoosterEl.textContent = ui.descBooster);
  descCalcEl && (descCalcEl.textContent = ui.descCalc);
  descClockEl && (descClockEl.textContent = ui.descClock);
  descNotesEl && (descNotesEl.textContent = ui.descNotes);
  descRateEl && (descRateEl.textContent = ui.descRate);
  descSystemEl && (descSystemEl.textContent = ui.descSystem);
  descDimmerEl && (descDimmerEl.textContent = ui.descDimmer);
  descTranslateEl && (descTranslateEl.textContent = ui.descTranslate);
  descNetestEl.textContent = ui.descNetest;
  descCamEl && (descCamEl.textContent = ui.descCam);
  descDeviceEl.textContent = ui.descDevice;
  wirecSubtitleEl.textContent = ui.wirecSubtitle;
  captureSectionTitleEl.textContent = ui.captureSection;
  soonTitleEl.textContent = ui.soonTitle;
  soonBodyEl.textContent = ui.soonBody;
  generalTitleEl.textContent = ui.general;

  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n as keyof SettingsUi | undefined;
    if (key && ui[key]) {
      el.textContent = String(ui[key]);
    }
  }

  applyAppEnablement();

  for (const item of shellNav.querySelectorAll<HTMLButtonElement>('.nav-item')) {
    const label = item.querySelector('.nav-label')?.textContent?.trim();
    if (label) {
      item.title = label;
    }
  }

  languageLabelEl.textContent = ui.language;
  launchLabelEl.textContent = ui.launchAtStartup;
  autoSaveLabelEl.textContent = ui.autoSaveCaptures;
  saveDirectoryLabelEl.textContent = ui.saveDirectory;
  browseSaveDirectoryBtn.textContent = ui.browseSaveDirectory;
  useSubfoldersLabelEl.textContent = ui.useCaptureSubfolders;
  subfoldersHintEl.textContent = ui.useCaptureSubfoldersHint;
  filenameSectionTitleEl.textContent = ui.filenameSection;
  filenameModeLabelEl.textContent = ui.filenameMode;
  filenameDateLabelEl.textContent = ui.filenameDateStyle;
  filenameTimeLabelEl.textContent = ui.filenameTimeStyle;
  filenamePreviewLabelEl.textContent = ui.filenamePreview;
  saveAsJpegLabelEl.textContent = ui.saveAsJpeg;
  jpegQualityLabelEl.textContent = ui.jpegQuality;
  hotkeysTitleEl.textContent = ui.hotkeys;

  filenameModeSelect.options[0].textContent = ui.filenameModeDatetime;
  filenameModeSelect.options[1].textContent = ui.filenameModeSequential;
  filenameDateStyleSelect.options[0].textContent = ui.filenameDateIso;
  filenameDateStyleSelect.options[1].textContent = ui.filenameDateLatin;
  filenameTimeStyleSelect.options[0].textContent = ui.filenameTime24;
  filenameTimeStyleSelect.options[1].textContent = ui.filenameTime12;
  hotkeysHintEl.textContent = ui.hotkeysHint;
  globalHotkeysTitleEl.textContent = ui.globalHotkeys;
  captureHotkeysTitleEl.textContent = ui.captureHotkeys;
  recordingHotkeysTitleEl.textContent = ui.recordingHotkeys;
  recordingSectionTitleEl.textContent = ui.recordingSection;
  recordFormatLabelEl.textContent = ui.recordFormat;
  recordQualityLabelEl.textContent = ui.recordQuality;
  recordFrameRateLabelEl.textContent = ui.recordFrameRate;
  recordFormatSelect.options[0].textContent = ui.recordFormatVp9;
  recordFormatSelect.options[1].textContent = ui.recordFormatVp8;
  recordFormatSelect.options[2].textContent = ui.recordFormatWebm;
  recordQualitySelect.options[0].textContent = ui.recordQualityLow;
  recordQualitySelect.options[1].textContent = ui.recordQualityMedium;
  recordQualitySelect.options[2].textContent = ui.recordQualityHigh;
  closeBtn.textContent = ui.close;
  captureSoundTitleEl.textContent = ui.captureSound;
  captureSoundEnabledLabelEl.textContent = ui.captureSoundEnabled;
  captureSoundPresetLabelEl.textContent = ui.captureSoundPreset;

  for (const [index, preset] of CAPTURE_SOUND_PRESETS.entries()) {
    captureSoundPresetSelect.options[index].textContent = ui[SOUND_LABEL_KEYS[preset]];
  }

  const langOptions = languageSelect.options;
  langOptions[0].textContent = ui.languageEn;
  langOptions[1].textContent = ui.languageEs;

  for (const action of [...GLOBAL_ACTIONS, ...OVERLAY_ACTIONS, ...RECORDING_ACTIONS]) {
    const container = GLOBAL_ACTIONS.includes(action)
      ? globalHotkeyGrid
      : OVERLAY_ACTIONS.includes(action)
        ? overlayHotkeyGrid
        : recordingHotkeyGrid;
    const rowLabel = container.querySelector(`[data-label="${action}"]`) as HTMLLabelElement | null;
    if (rowLabel) {
      rowLabel.textContent = ui[HOTKEY_LABEL_KEYS[action]];
    }
  }

  refreshHotkeyInputs();
  syncCaptureSoundPresetVisibility();
}

const MODULE_META: Record<
  string,
  { nameKey: keyof SettingsUi; descKey: keyof SettingsUi; soon: boolean }
> = {
  home: { nameKey: 'navHome', descKey: 'homeSubtitle', soon: false },
  wirec: { nameKey: 'navWirec', descKey: 'descWirec', soon: false },
  wiclick: { nameKey: 'navClick', descKey: 'descClick', soon: false },
  wibutton: { nameKey: 'navButton', descKey: 'descButton', soon: false },
  wibooster: { nameKey: 'navBooster', descKey: 'descBooster', soon: false },
  wicalc: { nameKey: 'navCalc', descKey: 'descCalc', soon: false },
  wiclock: { nameKey: 'navClock', descKey: 'descClock', soon: false },
  winotes: { nameKey: 'navNotes', descKey: 'descNotes', soon: false },
  wirate: { nameKey: 'navRate', descKey: 'descRate', soon: false },
  wisystem: { nameKey: 'navSystem', descKey: 'descSystem', soon: false },
  widimmer: { nameKey: 'navDimmer', descKey: 'descDimmer', soon: false },
  witranslate: { nameKey: 'navTranslate', descKey: 'descTranslate', soon: false },
  wiremote: { nameKey: 'navRemote', descKey: 'descRemote', soon: true },
  widraw: { nameKey: 'navDraw', descKey: 'descDraw', soon: false },
  winetest: { nameKey: 'navNetest', descKey: 'descNetest', soon: false },
  wicam: { nameKey: 'navCam', descKey: 'descCam', soon: false },
  widevice: { nameKey: 'navDevice', descKey: 'descDevice', soon: false },
};

function navSearchText(item: HTMLElement): string {
  const label = item.querySelector('.nav-label, strong, small')?.textContent ?? '';
  const extra = item.dataset.search ?? '';
  const title = item.getAttribute('title') ?? '';
  return `${label} ${extra} ${title}`.toLowerCase();
}

function matchesQuery(haystack: string, query: string): boolean {
  if (!query) {
    return true;
  }
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function applySearchFilter(): void {
  const query = shellSearchInput.value.trim().toLowerCase();
  let visibleNav = 0;

  for (const item of shellNav.querySelectorAll<HTMLButtonElement>('.nav-item')) {
    const match = matchesQuery(navSearchText(item), query);
    item.classList.toggle('is-filtered-out', !match);
    if (match) {
      visibleNav += 1;
    }
  }

  searchEmptyEl.hidden = !query || visibleNav > 0;

  const moduleList = document.getElementById('home-module-list');
  if (moduleList) {
    let visibleModules = 0;
    for (const row of moduleList.querySelectorAll<HTMLElement>('.module-row')) {
      const text = `${navSearchText(row)} ${(row.querySelector('small')?.textContent ?? '')}`.toLowerCase();
      const match = matchesQuery(text, query);
      row.classList.toggle('is-filtered-out', Boolean(query) && !match);
      if (!query || match) {
        visibleModules += 1;
      }
    }
    moduleList.classList.toggle('is-empty-filter', Boolean(query) && visibleModules === 0);
  }
}

function updateCompactToggleLabel(): void {
  if (!ui) {
    return;
  }
  const compact = shellEl.classList.contains('sidebar-compact');
  sidebarCompactLabel.textContent = compact ? ui.compactSidebarExpand : ui.compactSidebar;
  sidebarCompactToggle.title = sidebarCompactLabel.textContent;
  sidebarCompactToggle.setAttribute('aria-pressed', compact ? 'true' : 'false');
}

function applySidebarCompact(compact: boolean): void {
  shellEl.classList.toggle('sidebar-compact', compact);
  updateCompactToggleLabel();
}

function isAppEnabledLocal(appId: string): boolean {
  if (!draft?.enabledApps || !(appId in draft.enabledApps)) {
    return true;
  }
  return Boolean(draft.enabledApps[appId]);
}

function applyAppEnablement(): void {
  if (!draft) {
    return;
  }

  if (!draft.enabledApps) {
    draft.enabledApps = {};
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('[data-app-enable]')) {
    const appId = input.dataset.appEnable;
    if (!appId) {
      continue;
    }
    const enabled = isAppEnabledLocal(appId);
    input.checked = enabled;
    input.setAttribute('aria-label', ui?.appEnable ?? 'Enable app');

    const status = document.querySelector<HTMLElement>(`[data-app-status="${appId}"]`);
    if (status && ui) {
      status.textContent = enabled ? ui.moduleActive : ui.moduleOff;
      status.classList.toggle('is-off', !enabled);
      status.removeAttribute('data-i18n');
    }

    const row = input.closest<HTMLElement>('.module-row');
    row?.classList.toggle('is-app-off', !enabled);
  }

  for (const item of shellNav.querySelectorAll<HTMLButtonElement>('.nav-item')) {
    const panelId = item.dataset.panel;
    if (!panelId || panelId === 'home' || item.dataset.soon === '1') {
      item.classList.remove('is-app-disabled');
      continue;
    }
    const toggle = document.querySelector(`[data-app-enable="${panelId}"]`);
    if (!toggle) {
      item.classList.remove('is-app-disabled');
      continue;
    }
    item.classList.toggle('is-app-disabled', !isAppEnabledLocal(panelId));
  }
}

function setAppEnabled(appId: string, enabled: boolean): void {
  if (!draft) {
    return;
  }
  draft.enabledApps = { ...(draft.enabledApps ?? {}), [appId]: enabled };
  applyAppEnablement();

  const activeNav = shellNav.querySelector<HTMLButtonElement>('.nav-item.active');
  if (!enabled && activeNav?.dataset.panel === appId) {
    showPanel('home');
  }

  schedulePersist(0);
}

function showPanel(panelId: string): void {
  const meta = MODULE_META[panelId] ?? MODULE_META.home;
  if (!meta.soon && panelId !== 'home' && document.querySelector(`[data-app-enable="${panelId}"]`)) {
    if (!isAppEnabledLocal(panelId)) {
      showPanel('home');
      return;
    }
  }

  let target:
    | 'home'
    | 'wirec'
    | 'wiclick'
    | 'wibutton'
    | 'wibooster'
    | 'wicalc'
    | 'wiclock'
    | 'winotes'
    | 'wirate'
    | 'wisystem'
    | 'widimmer'
    | 'witranslate'
    | 'widraw'
    | 'winetest'
    | 'wicam'
    | 'widevice'
    | 'soon' = 'home';
  if (meta.soon) {
    target = 'soon';
  } else if (
    panelId === 'wirec' ||
    panelId === 'wiclick' ||
    panelId === 'wibutton' ||
    panelId === 'wibooster' ||
    panelId === 'wicalc' ||
    panelId === 'wiclock' ||
    panelId === 'winotes' ||
    panelId === 'wirate' ||
    panelId === 'wisystem' ||
    panelId === 'widimmer' ||
    panelId === 'witranslate' ||
    panelId === 'widraw' ||
    panelId === 'winetest' ||
    panelId === 'wicam' ||
    panelId === 'widevice' ||
    panelId === 'home'
  ) {
    target = panelId;
  }

  const panels: Array<[HTMLElement, string]> = [
    [panelHome, 'home'],
    [panelWirec, 'wirec'],
    [panelWiclick, 'wiclick'],
    [panelWibutton, 'wibutton'],
    [panelWibooster, 'wibooster'],
    [panelWicalc, 'wicalc'],
    [panelWiclock, 'wiclock'],
    [panelWinotes, 'winotes'],
    [panelWirate, 'wirate'],
    [panelWisystem, 'wisystem'],
    [panelWidimmer, 'widimmer'],
    [panelWitranslate, 'witranslate'],
    [panelWidraw, 'widraw'],
    [panelWinetest, 'winetest'],
    [panelWicam, 'wicam'],
    [panelWidevice, 'widevice'],
    [panelSoon, 'soon'],
  ];
  for (const [el, id] of panels) {
    const active = target === id;
    el.hidden = !active;
    el.classList.toggle('active', active);
  }

  for (const item of shellNav.querySelectorAll<HTMLButtonElement>('.nav-item')) {
    item.classList.toggle('active', item.dataset.panel === panelId);
  }

  if (target === 'soon' && ui) {
    soonModuleNameEl.textContent = String(ui[meta.nameKey]);
    soonModuleDescEl.textContent = String(ui[meta.descKey]);
  }

  const footer = document.querySelector('.footer') as HTMLElement | null;
  if (footer) {
    footer.hidden = target !== 'home' && target !== 'wirec' && target !== 'soon';
  }
}

function setupUtilityBridges(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (!data?.method) {
      return;
    }

    if (data.channel === 'wi-shell') {
      const api = (window as unknown as { wiShell?: Record<string, (...args: unknown[]) => unknown> })
        .wiShell;
      if (!api) {
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        const source = event.source as Window | null;
        source?.postMessage({ channel: 'wi-shell-response', id: data.id, result }, '*');
      } catch (error) {
        const source = event.source as Window | null;
        source?.postMessage(
          {
            channel: 'wi-shell-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-clock') {
      const api = (window as unknown as { wiClock?: Record<string, (...args: unknown[]) => unknown> })
        .wiClock;
      const frame = document.getElementById('wiclock-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      if (data.method === 'notify') {
        api.notify?.(...(data.args ?? []));
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-clock-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-clock-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-notes') {
      const api = (window as unknown as { wiNotes?: Record<string, (...args: unknown[]) => unknown> })
        .wiNotes;
      const frame = document.getElementById('winotes-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      if (data.method === 'notify') {
        api.notify?.(...(data.args ?? []));
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-notes-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-notes-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-rate') {
      const api = (window as unknown as { wiRate?: Record<string, (...args: unknown[]) => unknown> })
        .wiRate;
      const frame = document.getElementById('wirate-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      if (data.method === 'notify') {
        api.notify?.(...(data.args ?? []));
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-rate-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-rate-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-system') {
      const api = (window as unknown as { wiSystem?: Record<string, (...args: unknown[]) => unknown> })
        .wiSystem;
      const frame = document.getElementById('wisystem-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-system-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-system-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-dimmer') {
      const api = (window as unknown as { wiDimmer?: Record<string, (...args: unknown[]) => unknown> })
        .wiDimmer;
      const frame = document.getElementById('widimmer-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-dimmer-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-dimmer-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-translate') {
      const api = (window as unknown as {
        wiTranslate?: Record<string, (...args: unknown[]) => unknown>;
      }).wiTranslate;
      const frame = document.getElementById('witranslate-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-translate-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-translate-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
      return;
    }

    if (data.channel === 'wi-netest') {
      const api = (window as unknown as { wiNetest?: Record<string, (...args: unknown[]) => unknown> })
        .wiNetest;
      const frame = document.getElementById('winetest-frame') as HTMLIFrameElement | null;
      if (!api) {
        return;
      }
      try {
        const result = await Promise.resolve(api[data.method]?.(...(data.args ?? [])));
        frame?.contentWindow?.postMessage(
          { channel: 'wi-netest-response', id: data.id, result },
          '*',
        );
      } catch (error) {
        frame?.contentWindow?.postMessage(
          {
            channel: 'wi-netest-response',
            id: data.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '*',
        );
      }
    }
  });

  const clockApi = (window as unknown as {
    wiClock?: { onSettingsChanged?: (listener: (settings: unknown) => void) => () => void };
  }).wiClock;
  clockApi?.onSettingsChanged?.((settings) => {
    const frame = document.getElementById('wiclock-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-clock-settings', settings }, '*');
  });

  const notesApi = (window as unknown as {
    wiNotes?: { onSettingsChanged?: (listener: (settings: unknown) => void) => () => void };
  }).wiNotes;
  notesApi?.onSettingsChanged?.((settings) => {
    const frame = document.getElementById('winotes-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-notes-settings', settings }, '*');
  });

  const rateApi = (window as unknown as {
    wiRate?: { onSettingsChanged?: (listener: (settings: unknown) => void) => () => void };
  }).wiRate;
  rateApi?.onSettingsChanged?.((settings) => {
    const frame = document.getElementById('wirate-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-rate-settings', settings }, '*');
  });

  const dimmerApi = (window as unknown as {
    wiDimmer?: { onSettingsChanged?: (listener: (settings: unknown) => void) => () => void };
  }).wiDimmer;
  dimmerApi?.onSettingsChanged?.((payload) => {
    const frame = document.getElementById('widimmer-frame') as HTMLIFrameElement | null;
    const p = payload as { force?: boolean; settings?: unknown; monitors?: unknown };
    frame?.contentWindow?.postMessage(
      { channel: 'wi-dimmer-settings', payload: p, force: Boolean(p?.force) },
      '*',
    );
  });

  const translateApi = (window as unknown as {
    wiTranslate?: { onSettingsChanged?: (listener: (settings: unknown) => void) => () => void };
  }).wiTranslate;
  translateApi?.onSettingsChanged?.((settings) => {
    const frame = document.getElementById('witranslate-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-translate-settings', settings }, '*');
  });

  const netestApi = (window as unknown as {
    wiNetest?: { onProgress?: (listener: (progress: unknown) => void) => () => void };
  }).wiNetest;
  netestApi?.onProgress?.((progress) => {
    const frame = document.getElementById('winetest-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-netest-progress', progress }, '*');
  });
}

function setupWiboosterBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (data?.channel !== 'wi-booster' || !data.method) {
      return;
    }

    const api = (window as unknown as { wiBooster?: Record<string, (...args: unknown[]) => unknown> })
      .wiBooster;
    if (!api) {
      return;
    }

    const frame = document.getElementById('wibooster-frame') as HTMLIFrameElement | null;
    if (data.method === 'notify') {
      api.notify?.(...(data.args ?? []));
      return;
    }

    try {
      const fn = api[data.method];
      const result = await Promise.resolve(fn?.(...(data.args ?? [])));
      frame?.contentWindow?.postMessage(
        { channel: 'wi-booster-response', id: data.id, result },
        '*',
      );
    } catch (error) {
      frame?.contentWindow?.postMessage(
        {
          channel: 'wi-booster-response',
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '*',
      );
    }
  });
}

function setupWibuttonBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (data?.channel !== 'wi-button' || !data.method) {
      return;
    }

    const api = (window as unknown as { wiButton?: Record<string, (...args: unknown[]) => unknown> })
      .wiButton;
    if (!api) {
      return;
    }

    const frame = document.getElementById('wibutton-frame') as HTMLIFrameElement | null;
    if (data.method === 'notify') {
      api.notify?.(...(data.args ?? []));
      return;
    }

    try {
      const fn = api[data.method];
      const result = await Promise.resolve(fn?.(...(data.args ?? [])));
      frame?.contentWindow?.postMessage(
        { channel: 'wi-button-response', id: data.id, result },
        '*',
      );
    } catch (error) {
      frame?.contentWindow?.postMessage(
        {
          channel: 'wi-button-response',
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '*',
      );
    }
  });

  const api = (window as unknown as {
    wiButton?: {
      onStatus?: (listener: (status: unknown) => void) => () => void;
      onSettingsChanged?: (listener: (settings: unknown) => void) => () => void;
    };
  }).wiButton;
  api?.onStatus?.((status) => {
    const frame = document.getElementById('wibutton-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-button-status', status }, '*');
  });
  api?.onSettingsChanged?.((settings) => {
    const frame = document.getElementById('wibutton-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-button-settings', settings }, '*');
  });
}

function setupWidrawBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (data?.channel !== 'wi-draw' || !data.method) {
      return;
    }

    const api = (window as unknown as { wiDraw?: Record<string, (...args: unknown[]) => unknown> })
      .wiDraw;
    if (!api) {
      return;
    }

    const frame = document.getElementById('widraw-frame') as HTMLIFrameElement | null;
    if (data.method === 'notify') {
      api.notify?.(...(data.args ?? []));
      return;
    }

    try {
      const fn = api[data.method];
      const result = await Promise.resolve(fn?.(...(data.args ?? [])));
      frame?.contentWindow?.postMessage(
        { channel: 'wi-draw-response', id: data.id, result },
        '*',
      );
    } catch (error) {
      frame?.contentWindow?.postMessage(
        {
          channel: 'wi-draw-response',
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '*',
      );
    }
  });

  const api = (window as unknown as {
    wiDraw?: { onOpenState?: (listener: (state: { open: boolean }) => void) => () => void };
  }).wiDraw;
  api?.onOpenState?.((state) => {
    const frame = document.getElementById('widraw-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-draw-open', open: state.open }, '*');
  });
}

function setupWiclickBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (data?.channel !== 'wi-click' || !data.method) {
      return;
    }

    const api = (window as unknown as { wiClick?: Record<string, (...args: unknown[]) => unknown> })
      .wiClick;
    if (!api) {
      return;
    }

    const frame = document.getElementById('wiclick-frame') as HTMLIFrameElement | null;
    if (data.method === 'notify') {
      api.notify?.(...(data.args ?? []));
      return;
    }

    try {
      const fn = api[data.method];
      const result = await Promise.resolve(fn?.(...(data.args ?? [])));
      frame?.contentWindow?.postMessage(
        { channel: 'wi-click-response', id: data.id, result },
        '*',
      );
    } catch (error) {
      frame?.contentWindow?.postMessage(
        {
          channel: 'wi-click-response',
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '*',
      );
    }
  });

  const api = (window as unknown as {
    wiClick?: { onStatus?: (listener: (status: unknown) => void) => () => void };
  }).wiClick;
  api?.onStatus?.((status) => {
    const frame = document.getElementById('wiclick-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.postMessage({ channel: 'wi-click-status', status }, '*');
  });
}

function setupWideviceBridge(): void {
  window.addEventListener('message', async (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      method?: string;
      args?: unknown[];
    };
    if (data?.channel !== 'wi-device' || !data.method) {
      return;
    }

    const api = (window as unknown as { wiDevice?: Record<string, (...args: unknown[]) => unknown> })
      .wiDevice;
    if (!api) {
      return;
    }

    const frame = document.getElementById('widevice-frame') as HTMLIFrameElement | null;
    if (data.method === 'notify') {
      api.notify?.(...(data.args ?? []));
      return;
    }

    try {
      const fn = api[data.method];
      const result = await Promise.resolve(fn?.(...(data.args ?? [])));
      frame?.contentWindow?.postMessage(
        { channel: 'wi-device-response', id: data.id, result },
        '*',
      );
    } catch (error) {
      frame?.contentWindow?.postMessage(
        {
          channel: 'wi-device-response',
          id: data.id,
          error: error instanceof Error ? error.message : String(error),
        },
        '*',
      );
    }
  });
}

function setupShellNavigation(): void {
  setupWideviceBridge();
  setupWiclickBridge();
  setupWidrawBridge();
  setupWibuttonBridge();
  setupWiboosterBridge();
  setupUtilityBridges();

  shellNav.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.nav-item');
    if (
      !button?.dataset.panel ||
      button.classList.contains('is-filtered-out') ||
      button.classList.contains('is-app-disabled')
    ) {
      return;
    }
    showPanel(button.dataset.panel);
  });

  const moduleList = document.getElementById('home-module-list');
  const MODULES_VIEW_KEY = 'wi-btk-modules-view';

  function applyModulesView(view: 'list' | 'grid'): void {
    if (!moduleList) {
      return;
    }
    moduleList.classList.toggle('is-grid', view === 'grid');
    for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-modules-view]')) {
      btn.classList.toggle('active', btn.dataset.modulesView === view);
    }
    try {
      localStorage.setItem(MODULES_VIEW_KEY, view);
    } catch {
      // ignore
    }
  }

  const savedView = (() => {
    try {
      const v = localStorage.getItem(MODULES_VIEW_KEY);
      return v === 'list' || v === 'grid' ? v : 'grid';
    } catch {
      return 'grid';
    }
  })();
  applyModulesView(savedView);

  document.querySelector('.view-toggle')?.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-modules-view]');
    if (!btn?.dataset.modulesView) {
      return;
    }
    const view = btn.dataset.modulesView === 'list' ? 'list' : 'grid';
    applyModulesView(view);
  });

  moduleList?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-stop-nav]')) {
      return;
    }
    const row = target.closest<HTMLElement>('.module-row');
    if (!row?.dataset.open || row.classList.contains('is-filtered-out')) {
      return;
    }
    showPanel(row.dataset.open);
  });

  moduleList?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const row = (event.target as HTMLElement).closest<HTMLElement>('.module-row');
    if (!row?.dataset.open || row.classList.contains('is-filtered-out')) {
      return;
    }
    if ((event.target as HTMLElement).closest('[data-stop-nav]')) {
      return;
    }
    event.preventDefault();
    showPanel(row.dataset.open);
  });

  moduleList?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    const appId = input.dataset.appEnable;
    if (!appId || input.type !== 'checkbox') {
      return;
    }
    setAppEnabled(appId, input.checked);
  });

  shellSearchInput.addEventListener('input', () => {
    applySearchFilter();
  });

  shellSearchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') {
      return;
    }
    const first = shellNav.querySelector<HTMLButtonElement>(
      '.nav-item:not(.is-filtered-out):not(.is-app-disabled)',
    );
    if (first?.dataset.panel) {
      showPanel(first.dataset.panel);
    }
  });

  sidebarCompactToggle.addEventListener('click', () => {
    if (!draft) {
      return;
    }
    draft.sidebarIconsOnly = !draft.sidebarIconsOnly;
    applySidebarCompact(draft.sidebarIconsOnly);
    schedulePersist(0);
  });
}

function syncCaptureSoundPresetVisibility(): void {
  const enabled = captureSoundEnabledCheckbox.checked;
  captureSoundPresetFieldEl.style.display = enabled ? '' : 'none';
}

function syncDraftFromControls(): void {
  if (!draft) {
    return;
  }

  draft.language = languageSelect.value as Language;
  draft.launchAtStartup = launchCheckbox.checked;
  draft.autoSaveCaptures = autoSaveCheckbox.checked;
  draft.saveDirectory = saveDirectoryInput.value.trim();
  draft.useCaptureSubfolders = useSubfoldersCheckbox.checked;
  draft.captureSoundEnabled = captureSoundEnabledCheckbox.checked;
  draft.captureSoundPreset = captureSoundPresetSelect.value as CaptureSoundPreset;
  draft.recordFormat = recordFormatSelect.value as RecordFormat;
  draft.recordQuality = recordQualitySelect.value as RecordQuality;
  draft.recordFrameRate = Number.parseInt(recordFrameRateSelect.value, 10) as RecordFrameRate;
  syncDraftFromFilenameControls();
}

async function persistDraft(): Promise<void> {
  if (!draft) {
    return;
  }

  syncDraftFromControls();
  const result = await window.wiRecSettings.saveSettings(draft);
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }

  setStatus(ui?.saved ?? 'Saved', 'ok');
  if (savedStatusTimer) {
    clearTimeout(savedStatusTimer);
  }
  savedStatusTimer = setTimeout(() => setStatus(''), 2000);
}

function schedulePersist(delayMs = 400): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistDraft();
  }, delayMs);
}

function buildHotkeyRow(
  action: HotkeyAction,
  settings: AppSettings,
  container: HTMLDivElement,
): void {
  const row = document.createElement('div');
  row.className = 'hotkey-row';

  const label = document.createElement('label');
  label.dataset.label = action;
  label.textContent = ui ? ui[HOTKEY_LABEL_KEYS[action]] : action;

  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.className = 'hotkey-input';
  input.value = settings.hotkeys[action]
    ? formatAcceleratorForDisplay(settings.hotkeys[action])
    : (ui?.notAssigned ?? '');

  input.addEventListener('focus', () => startRecording(action, input));
  input.addEventListener('blur', () => stopRecording(action, input));

  hotkeyInputs.set(action, input);
  row.append(label, input);
  container.append(row);
}

function buildHotkeyRows(settings: AppSettings): void {
  globalHotkeyGrid.innerHTML = '';
  overlayHotkeyGrid.innerHTML = '';
  hotkeyInputs.clear();

  for (const action of GLOBAL_ACTIONS) {
    buildHotkeyRow(action, settings, globalHotkeyGrid);
  }

  for (const action of OVERLAY_ACTIONS) {
    buildHotkeyRow(action, settings, overlayHotkeyGrid);
  }

  for (const action of RECORDING_ACTIONS) {
    buildHotkeyRow(action, settings, recordingHotkeyGrid);
  }
}

function stopRecordingListener(): void {
  if (recordingListener) {
    window.removeEventListener('keydown', recordingListener, true);
    recordingListener = null;
  }
  if (recordingKeyupListener) {
    window.removeEventListener('keyup', recordingKeyupListener, true);
    recordingKeyupListener = null;
  }
}

function stopHotkeyCapture(): void {
  if (!recordingInput || !recordingAction) {
    stopRecordingListener();
    recordingAction = null;
    recordingInput = null;
    return;
  }

  const action = recordingAction;
  const input = recordingInput;
  stopRecordingListener();
  recordingAction = null;
  recordingInput = null;
  input.classList.remove('recording');
  input.value = displayHotkeyValue(action);
}

async function finishHotkeyRecord(
  action: HotkeyAction,
  input: HTMLInputElement,
  accelerator: string,
): Promise<void> {
  if (!draft) {
    return;
  }

  stopHotkeyCapture();

  const result = await window.wiRecSettings.assignHotkey(
    action,
    accelerator,
    draft.hotkeys,
    draft.language,
  );

  if (!result.ok) {
    input.value = displayHotkeyValue(action);
    return;
  }

  draft.hotkeys = result.hotkeys;
  refreshHotkeyInputs();
  input.blur();
  await persistDraft();
}

function tryCommitHotkey(
  action: HotkeyAction,
  input: HTMLInputElement,
  event: KeyboardEvent,
): boolean {
  if (document.activeElement !== input) {
    stopHotkeyCapture();
    return true;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    stopHotkeyCapture();
    return true;
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    stopHotkeyCapture();
    return true;
  }

  const preview = previewAccelerator(event);
  if (preview && !preview.endsWith('+…')) {
    event.preventDefault();
    event.stopPropagation();
    void finishHotkeyRecord(action, input, preview);
    return true;
  }

  if (preview) {
    event.preventDefault();
    event.stopPropagation();
    input.value = formatAcceleratorForDisplay(preview);
    return true;
  }

  const accelerator = keyboardEventToAccelerator(event);
  if (accelerator) {
    event.preventDefault();
    event.stopPropagation();
    void finishHotkeyRecord(action, input, accelerator);
    return true;
  }

  if (event.key !== 'Unidentified' && event.key !== 'Dead') {
    setStatus(ui?.hotkeyTooManyKeys ?? 'Use at most 3 keys.', 'error');
  }

  return false;
}

function startRecording(action: HotkeyAction, input: HTMLInputElement): void {
  stopHotkeyCapture();
  recordingAction = action;
  recordingInput = input;
  input.classList.add('recording');
  if (ui) {
    input.value = ui.pressKeys;
  }

  recordingListener = (event: KeyboardEvent) => {
    if (recordingAction !== action || recordingInput !== input || !draft) {
      return;
    }

    if (document.activeElement !== input) {
      stopHotkeyCapture();
      return;
    }

    tryCommitHotkey(action, input, event);
  };

  recordingKeyupListener = (event: KeyboardEvent) => {
    if (recordingAction !== action || recordingInput !== input || !draft) {
      return;
    }

    if (document.activeElement !== input) {
      stopHotkeyCapture();
      return;
    }

    const key = keyFromKeyboardEvent(event);
    if (!key || event.type !== 'keyup') {
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Escape') {
      return;
    }

    const accelerator = buildAcceleratorFromEvent(event);
    if (!accelerator) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void finishHotkeyRecord(action, input, accelerator);
  };

  window.addEventListener('keydown', recordingListener, true);
  window.addEventListener('keyup', recordingKeyupListener, true);
}

function stopRecording(action: HotkeyAction, input: HTMLInputElement): void {
  if (recordingAction !== action) {
    return;
  }

  stopHotkeyCapture();
}

function syncFilenameFieldsVisibility(): void {
  const sequential = filenameModeSelect.value === 'sequential';
  filenameDateFieldEl.style.display = sequential ? 'none' : '';
  filenameTimeFieldEl.style.display = sequential ? 'none' : '';
}

async function refreshFilenamePreview(): Promise<void> {
  if (!draft) {
    return;
  }

  filenamePreviewEl.textContent = await window.wiRecSettings.previewFilename(draft);
}

function syncDraftFromFilenameControls(): void {
  if (!draft) {
    return;
  }

  draft.filenameMode = filenameModeSelect.value as FilenameMode;
  draft.filenameDateStyle = filenameDateStyleSelect.value as FilenameDateStyle;
  draft.filenameTimeStyle = filenameTimeStyleSelect.value as FilenameTimeStyle;
  draft.saveAsJpeg = saveAsJpegCheckbox.checked;
  draft.jpegQuality = Number.parseInt(jpegQualityInput.value, 10);
}

async function refreshUi(language: Language): Promise<void> {
  ui = await window.wiRecSettings.getUi(language);
  applyLanguage();
  syncFilenameFieldsVisibility();
  await refreshFilenamePreview();
}

async function init(): Promise<void> {
  try {
    if (!window.wiRecSettings) {
      throw new Error('Settings API unavailable');
    }

    draft = await window.wiRecSettings.getSettings();
    if (!draft.enabledApps) {
      draft.enabledApps = {};
    }
    languageSelect.value = draft.language;
    launchCheckbox.checked = draft.launchAtStartup;
    autoSaveCheckbox.checked = draft.autoSaveCaptures;
    saveDirectoryInput.value = draft.saveDirectory;
    useSubfoldersCheckbox.checked = draft.useCaptureSubfolders;
    filenameModeSelect.value = draft.filenameMode;
    filenameDateStyleSelect.value = draft.filenameDateStyle;
    filenameTimeStyleSelect.value = draft.filenameTimeStyle;
    saveAsJpegCheckbox.checked = draft.saveAsJpeg;
    jpegQualityInput.value = String(draft.jpegQuality);
    jpegQualityValueEl.textContent = String(draft.jpegQuality);
    captureSoundEnabledCheckbox.checked = draft.captureSoundEnabled;
    captureSoundPresetSelect.value = draft.captureSoundPreset;
    recordFormatSelect.value = draft.recordFormat;
    recordQualitySelect.value = draft.recordQuality;
    recordFrameRateSelect.value = String(draft.recordFrameRate);
    saveDirectoryInput.placeholder = await window.wiRecSettings.getResolvedSaveDirectory();
    await refreshUi(draft.language);
    buildHotkeyRows(draft);
    applySidebarCompact(Boolean(draft.sidebarIconsOnly));
    setupShellNavigation();
    applyAppEnablement();
    showPanel('home');
    applySearchFilter();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(message, 'error');
    return;
  }

  languageSelect.addEventListener('change', async () => {
    if (!draft) {
      return;
    }
    draft.language = languageSelect.value as Language;
    await refreshUi(draft.language);
    await persistDraft();
  });

  launchCheckbox.addEventListener('change', () => {
    schedulePersist();
  });

  autoSaveCheckbox.addEventListener('change', () => {
    schedulePersist();
  });

  saveDirectoryInput.addEventListener('input', () => {
    schedulePersist();
  });

  useSubfoldersCheckbox.addEventListener('change', () => {
    schedulePersist();
  });

  browseSaveDirectoryBtn.addEventListener('click', async () => {
    const selected = await window.wiRecSettings.browseSaveDirectory();
    if (!selected || !draft) {
      return;
    }
    saveDirectoryInput.value = selected;
    schedulePersist(0);
  });

  captureSoundEnabledCheckbox.addEventListener('change', () => {
    syncCaptureSoundPresetVisibility();
    schedulePersist();
  });

  recordFormatSelect.addEventListener('change', () => {
    schedulePersist();
  });

  recordQualitySelect.addEventListener('change', () => {
    schedulePersist();
  });

  recordFrameRateSelect.addEventListener('change', () => {
    schedulePersist();
  });

  captureSoundPresetSelect.addEventListener('change', async () => {
    if (!draft) {
      return;
    }
    syncDraftFromControls();
    if (draft.captureSoundEnabled) {
      await window.wiRecSettings.previewCaptureSound(draft);
    }
    schedulePersist(0);
  });

  filenameModeSelect.addEventListener('change', async () => {
    syncFilenameFieldsVisibility();
    await refreshFilenamePreview();
    schedulePersist();
  });

  filenameDateStyleSelect.addEventListener('change', async () => {
    await refreshFilenamePreview();
    schedulePersist();
  });

  filenameTimeStyleSelect.addEventListener('change', async () => {
    await refreshFilenamePreview();
    schedulePersist();
  });

  saveAsJpegCheckbox.addEventListener('change', async () => {
    await refreshFilenamePreview();
    schedulePersist();
  });

  jpegQualityInput.addEventListener('input', () => {
    jpegQualityValueEl.textContent = jpegQualityInput.value;
    schedulePersist();
  });

  closeBtn.addEventListener('click', () => {
    stopHotkeyCapture();
    window.wiRecSettings.closeWindow();
  });

  document.addEventListener('focusin', (event) => {
    if (!recordingInput || event.target === recordingInput) {
      return;
    }
    stopHotkeyCapture();
  });
}

void init();
