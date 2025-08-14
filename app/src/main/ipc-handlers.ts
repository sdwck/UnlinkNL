import { ipcMain, dialog, BrowserWindow } from 'electron';
import { settingsStore } from './store/SettingsStore';
import { profileStore } from './store/ProfileStore';
import { CliService, CliRunOptions } from './services/CliService';
import { IAppSettings, IProfile } from '../shared/types';
import { LocalService } from './services/LocalService';
import fs from 'fs/promises';
import path from 'path';
import { shell } from 'electron';

interface AppServices {
    mainWindow: BrowserWindow;
    cliService: CliService;
    localService: LocalService;
}

export function registerIpcHandlers(services: AppServices) {
    const { mainWindow, cliService, localService } = services;

    const notifyProfilesChanged = () => {
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('profiles:changed');
        });
    };

    ipcMain.handle('settings:get', () => settingsStore.getSettings());
    ipcMain.handle('settings:save', (event, settings: Partial<IAppSettings>) => {
        settingsStore.saveSettings(settings);
    });

    ipcMain.handle('profiles:get-all', () => profileStore.getAll());

    ipcMain.handle('profiles:add', (event, profile: IProfile): IProfile => {
        notifyProfilesChanged();
        return profileStore.add(profile);
    });

    ipcMain.handle('profiles:create', async (event, profileName: string) => {
        const settings = settingsStore.getSettings();
        const newProfileData = await services.cliService.createProfile(profileName, settings);

        const newProfile: IProfile = {
            ...newProfileData,
            steamAccounts: [],
        };
        profileStore.add(newProfile);
        return newProfile;
    });

    ipcMain.handle('profiles:update', (event, profileId: string, updates: Partial<IProfile>) => {
        profileStore.update(profileId, updates);
        notifyProfilesChanged();
    });
    ipcMain.handle('profiles:set-avatar', (event, profileId: string, sourcePath: string) => {
        const result = services.localService.setProfileAvatar(profileId, sourcePath)
        notifyProfilesChanged();
        return result;
    });
    ipcMain.handle('profiles:delete', async (event, profileId: string) => {
        await services.cliService.deleteProfile(profileId);
        profileStore.delete(profileId);
        notifyProfilesChanged();
    });

    ipcMain.handle('accounts:delete', async (event, profileId: string, accountId: string) => {
        await services.cliService.deleteAccount(profileId, accountId);
        profileStore.deleteAccount(profileId, accountId);
        notifyProfilesChanged();
    });
    ipcMain.handle('app:show-open-dialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }]
        });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('profiles:get-accounts', (event, profileId: string) => {
        return localService.getAccountsForProfile(profileId);
    });

    ipcMain.handle('profiles:get-games', (event, profileId: string, accountId: string) => {
        return localService.getGamesForAccount(profileId, accountId);
    });

    ipcMain.handle('app:run-unlink', async (event, options: CliRunOptions) => {
        const settings = settingsStore.getSettings();
        await cliService.runUnlink(settings, options);
    });

    ipcMain.handle('app:read-file-as-base64', async (event, filePath: string) => {
        try {
            const buffer = await fs.readFile(filePath);
            const base64 = buffer.toString('base64');
            const extension = path.extname(filePath).slice(1);
            return `data:image/${extension};base64,${base64}`;
        } catch (error) {
            console.error(`Failed to read file as base64: ${filePath}`, error);
            return null;
        }
    });

    ipcMain.handle('app:get-steam-path-from-cli', async () => {
        const result = await cliService.getSteamPath();
        if (result.success && result.steamPath) {
            settingsStore.set('steamPath', result.steamPath);
            return result.steamPath;
        }
        return null;
    });

    ipcMain.handle('app:get-selected-profile-from-cli', async () => {
        const steamPath = settingsStore.get('steamPath');
        if (!steamPath) return null;
        const result = await cliService.getSelectedProfile(steamPath);
        if (result.success && result.currentProfile) {
            settingsStore.set('selectedProfileId', result.currentProfile);
            return result.currentProfile;
        }
        return null;
    });

    ipcMain.handle('app:select-steam-path-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select your Steam folder'
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const selectedPath = result.filePaths[0];
        try {
            await fs.access(path.join(selectedPath, 'steam.exe'));
            settingsStore.set('steamPath', selectedPath);
            return selectedPath;
        } catch {
            dialog.showErrorBox('Invalid Folder', `steam.exe not found in "${selectedPath}".`);
            return null;
        }
    });

    ipcMain.handle('app:open-external', async (event, url: string) => {
        shell.openExternal(url).catch(err => {
            console.error(`Failed to open external URL: ${url}`, err);
        });
    });
}