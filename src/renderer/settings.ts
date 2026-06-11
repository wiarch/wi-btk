import {
  formatAcceleratorForDisplay,
  keyboardEventToAccelerator,
  previewAccelerator,
} from './hotkeyInput.js';

export {};

type Language = 'en' | 'es';

type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'colorPicker'
  | 'colorPickerPanel'
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel';

type FilenameMode = 'datetime' | 'sequential';
type FilenameDateStyle = 'iso' | 'latin';
type FilenameTimeStyle = 'h24' | 'h12';
type CaptureSoundPreset = 'chime' | 'pop' | 'shutter' | 'ding';

type AppSettings = {
  language: Language;
  launchAtStartup: boolean;
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
  hotkeys: Record<HotkeyAction, string>;
};

type SettingsUi = {
  title: string;
  subtitle: string;
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
  hotkeyArrow: string;
  hotkeyRect: string;
  hotkeySave: string;
  hotkeyCopy: string;
  hotkeyCancel: string;
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
];
const OVERLAY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];

const HOTKEY_LABEL_KEYS: Record<HotkeyAction, keyof SettingsUi> = {
  capture: 'hotkeyCapture',
  captureFullScreen: 'hotkeyCaptureFullScreen',
  colorPicker: 'hotkeyColorPicker',
  colorPickerPanel: 'hotkeyColorPickerPanel',
  arrow: 'hotkeyArrow',
  rect: 'hotkeyRect',
  save: 'hotkeySave',
  copy: 'hotkeyCopy',
  cancel: 'hotkeyCancel',
};

const titleEl = document.getElementById('title') as HTMLHeadingElement;
const subtitleEl = document.getElementById('subtitle') as HTMLParagraphElement;
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
  generalTitleEl.textContent = ui.general;
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

  for (const action of [...GLOBAL_ACTIONS, ...OVERLAY_ACTIONS]) {
    const container = GLOBAL_ACTIONS.includes(action) ? globalHotkeyGrid : overlayHotkeyGrid;
    const rowLabel = container.querySelector(`[data-label="${action}"]`) as HTMLLabelElement | null;
    if (rowLabel) {
      rowLabel.textContent = ui[HOTKEY_LABEL_KEYS[action]];
    }
  }

  refreshHotkeyInputs();
  syncCaptureSoundPresetVisibility();
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
}

function stopRecordingListener(): void {
  if (recordingListener) {
    window.removeEventListener('keydown', recordingListener, true);
    recordingListener = null;
  }
}

async function finishHotkeyRecord(
  action: HotkeyAction,
  input: HTMLInputElement,
  accelerator: string,
): Promise<void> {
  if (!draft) {
    return;
  }

  stopRecordingListener();
  recordingAction = null;
  recordingInput = null;
  input.classList.remove('recording');

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

function startRecording(action: HotkeyAction, input: HTMLInputElement): void {
  stopRecordingListener();
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

    event.preventDefault();
    event.stopPropagation();

    const preview = previewAccelerator(event);
    if (preview && !preview.endsWith('+…')) {
      void finishHotkeyRecord(action, input, preview);
      return;
    }

    if (preview) {
      input.value = formatAcceleratorForDisplay(preview);
      return;
    }

    const accelerator = keyboardEventToAccelerator(event);
    if (accelerator) {
      void finishHotkeyRecord(action, input, accelerator);
    }
  };

  window.addEventListener('keydown', recordingListener, true);
}

function stopRecording(action: HotkeyAction, input: HTMLInputElement): void {
  if (recordingAction !== action) {
    return;
  }

  stopRecordingListener();
  recordingAction = null;
  recordingInput = null;
  input.classList.remove('recording');
  input.value = displayHotkeyValue(action);
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
    saveDirectoryInput.placeholder = await window.wiRecSettings.getResolvedSaveDirectory();
    await refreshUi(draft.language);
    buildHotkeyRows(draft);
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
    window.wiRecSettings.closeWindow();
  });
}

void init();
