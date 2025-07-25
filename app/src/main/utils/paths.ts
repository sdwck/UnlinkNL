import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export function getAppSettingsFolder(): string {
  const appDataPath = app.getPath('appData');
  const settingsFolder = path.join(appDataPath, 'NL', 'Unlink');
  fs.mkdirSync(settingsFolder, { recursive: true });
  return settingsFolder;
}
