import { Notification, shell } from 'electron';
import { basename } from 'node:path';
import { t } from '../shared/i18n';
import type { Language } from '../shared/settings';

export function notifyCaptureSaved(
  language: Language,
  titleKey: string,
  hintKey: string,
  filePath: string,
): void {
  if (!Notification.isSupported()) {
    return;
  }

  const filename = basename(filePath);
  const body = `${t(language, titleKey, { path: filePath, filename })}\n${filePath}\n${t(language, hintKey)}`;

  const notification = new Notification({
    title: 'WI-Rec',
    body,
  });

  notification.on('click', () => {
    shell.showItemInFolder(filePath);
  });

  notification.show();
}

export function notifySimple(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}
