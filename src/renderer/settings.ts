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
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel';

type FilenameMode = 'datetime' | 'sequential';
type FilenameDateStyle = 'iso' | 'latin';
type FilenameTimeStyle = 'h24' | 'h12';

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
  hotkeyArrow: string;
  hotkeyRect: string;
  hotkeySave: string;
  hotkeyCopy: string;
  hotkeyCancel: string;
  pressKeys: string;
  notAssigned: string;
  save: string;
  cancel: string;
  saved: string;
};

type AssignHotkeyResult =
  | { ok: true; hotkeys: AppSettings['hotkeys'] }
  | { ok: false; reason: 'cancelled' | 'invalid' };

type WiPrintSettingsApi = {
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
  closeWindow(): void;
};

declare global {
  interface Window {
    wiPrintSettings: WiPrintSettingsApi;
  }
}

const GLOBAL_ACTIONS: HotkeyAction[] = ['capture', 'captureFullScreen'];
const OVERLAY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];

const HOTKEY_LABEL_KEYS: Record<HotkeyAction, keyof SettingsUi> = {
  capture: 'hotkeyCapture',
  captureFullScreen: 'hotkeyCaptureFullScreen',
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
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

let draft: AppSettings | null = null;
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
  saveBtn.textContent = ui.save;
  cancelBtn.textContent = ui.cancel;

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

  const result = await window.wiPrintSettings.assignHotkey(
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
  setStatus('');
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

  filenamePreviewEl.textContent = await window.wiPrintSettings.previewFilename(draft);
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
  ui = await window.wiPrintSettings.getUi(language);
  applyLanguage();
  syncFilenameFieldsVisibility();
  await refreshFilenamePreview();
}

async function init(): Promise<void> {
  try {
    if (!window.wiPrintSettings) {
      throw new Error('Settings API unavailable');
    }

    draft = await window.wiPrintSettings.getSettings();
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
    saveDirectoryInput.placeholder = await window.wiPrintSettings.getResolvedSaveDirectory();
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
  });

  launchCheckbox.addEventListener('change', () => {
    if (!draft) {
      return;
    }
    draft.launchAtStartup = launchCheckbox.checked;
  });

  autoSaveCheckbox.addEventListener('change', () => {
    if (!draft) {
      return;
    }
    draft.autoSaveCaptures = autoSaveCheckbox.checked;
  });

  saveDirectoryInput.addEventListener('input', () => {
    if (!draft) {
      return;
    }
    draft.saveDirectory = saveDirectoryInput.value.trim();
  });

  useSubfoldersCheckbox.addEventListener('change', () => {
    if (!draft) {
      return;
    }
    draft.useCaptureSubfolders = useSubfoldersCheckbox.checked;
  });

  browseSaveDirectoryBtn.addEventListener('click', async () => {
    const selected = await window.wiPrintSettings.browseSaveDirectory();
    if (!selected || !draft) {
      return;
    }
    draft.saveDirectory = selected;
    saveDirectoryInput.value = selected;
  });

  filenameModeSelect.addEventListener('change', async () => {
    syncDraftFromFilenameControls();
    syncFilenameFieldsVisibility();
    await refreshFilenamePreview();
  });

  filenameDateStyleSelect.addEventListener('change', async () => {
    syncDraftFromFilenameControls();
    await refreshFilenamePreview();
  });

  filenameTimeStyleSelect.addEventListener('change', async () => {
    syncDraftFromFilenameControls();
    await refreshFilenamePreview();
  });

  saveAsJpegCheckbox.addEventListener('change', async () => {
    syncDraftFromFilenameControls();
    await refreshFilenamePreview();
  });

  jpegQualityInput.addEventListener('input', () => {
    jpegQualityValueEl.textContent = jpegQualityInput.value;
    syncDraftFromFilenameControls();
  });

  cancelBtn.addEventListener('click', () => {
    window.wiPrintSettings.closeWindow();
  });

  saveBtn.addEventListener('click', async () => {
    if (!draft) {
      return;
    }

    if (!draft) {
      return;
    }

    draft.saveDirectory = saveDirectoryInput.value.trim();
    draft.useCaptureSubfolders = useSubfoldersCheckbox.checked;
    syncDraftFromFilenameControls();

    setStatus('');
    const result = await window.wiPrintSettings.saveSettings(draft);
    if (!result.ok) {
      setStatus(result.error, 'error');
      return;
    }

    setStatus(ui?.saved ?? 'Saved', 'ok');
    setTimeout(() => window.wiPrintSettings.closeWindow(), 500);
  });
}

void init();
