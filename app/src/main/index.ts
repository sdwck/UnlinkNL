import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { getAppSettingsFolder } from './utils/paths';

app.setPath('userData', path.join(getAppSettingsFolder(), 'userData'));
app.setPath('logs', path.join(getAppSettingsFolder(), 'logs'));

import { LocalService } from './services/LocalService';
import { CliService } from './services/CliService';
import { registerIpcHandlers } from './ipc-handlers';
import { settingsStore } from './store/SettingsStore';
import { profileStore } from './store/ProfileStore';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let appIsReady = false;

const createWindow = async () => {
  if (!appIsReady) {
    await app.whenReady();
    appIsReady = true;
  }

  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 940,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    show: false,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  const localService = new LocalService(mainWindow);
  const cliService = new CliService(mainWindow);

  await localService.initializeProfiles();

  let profiles = profileStore.getAll();
  const initProfilesLength = profiles.length;

  if (profiles.length === 0) {
    const mainProfile = {
      id: 'main',
      name: 'Main',
      steamAccounts: [],
    };
    profileStore.add(mainProfile);
    settingsStore.set('selectedProfileId', 'main');
    profiles = profileStore.getAll();
  }

  if (profiles.length > 7) {
    mainWindow.setSize(1250, 850);
  }

  const pathFromCli = await cliService.getSteamPath();
  if (pathFromCli.success && pathFromCli.steamPath) {
    settingsStore.set('steamPath', pathFromCli.steamPath!);
  }

  if (initProfilesLength !== 0) {
    const steamPath = settingsStore.get('steamPath');
    if (steamPath) {
      const profileFromCli = await cliService.getSelectedProfile(steamPath);
      if (profileFromCli.success && profileFromCli.currentProfile) {
        settingsStore.set('selectedProfileId', profileFromCli.currentProfile);
      } else {
        console.warn(`Could not determine selected profile from CLI. Defaulting to 'main'. Error: ${profileFromCli.error || 'Unknown'}`);
        settingsStore.set('selectedProfileId', 'main');
      }
    }
  }

  registerIpcHandlers({
    mainWindow: mainWindow!,
    cliService,
    localService
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});