import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IAppSettings, IProfile } from '../shared/types';
import { CliRunOptions } from './services/CliService';
import { ISteamAccount } from '../shared/types';
import { IGame } from '../shared/types';

export const electronAPI = {
  getSettings: (): Promise<IAppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<IAppSettings>): Promise<void> => ipcRenderer.invoke('settings:save', settings),

  getAllProfiles: (): Promise<IProfile[]> => ipcRenderer.invoke('profiles:get-all'),
  addProfile: (profile: IProfile): Promise<IProfile> => ipcRenderer.invoke('profiles:add', profile),
  createProfile: (name: string): Promise<IProfile> => ipcRenderer.invoke('profiles:create', name),
  deleteProfile: (profileId: string): Promise<void> => ipcRenderer.invoke('profiles:delete', profileId),
  updateProfile: (profileId: string, updates: Partial<IProfile>): Promise<void> => ipcRenderer.invoke('profiles:update', profileId, updates),
  setProfileAvatar: (profileId: string, sourcePath: string): Promise<string> => ipcRenderer.invoke('profiles:set-avatar', profileId, sourcePath),
  deleteAccount: (profileId: string, accountId: string): Promise<void> => ipcRenderer.invoke('accounts:delete', profileId, accountId),
  showOpenDialog: (): Promise<string | null> => ipcRenderer.invoke('app:show-open-dialog'),
  readFileAsBase64: (filePath: string): Promise<string | null> => ipcRenderer.invoke('app:read-file-as-base64', filePath),
  getAccountsForProfile: (profileId: string): Promise<ISteamAccount[]> => ipcRenderer.invoke('profiles:get-accounts', profileId),
  getGamesForAccount: (profileId: string, accountId: string): Promise<IGame[]> => ipcRenderer.invoke('profiles:get-games', profileId, accountId),

  runUnlink: (options: CliRunOptions): Promise<void> => ipcRenderer.invoke('app:run-unlink', options),

  getSteamPathFromCli: (): Promise<string | null> => ipcRenderer.invoke('app:get-steam-path-from-cli'),
  getSelectedProfileFromCli: (): Promise<string | null> => ipcRenderer.invoke('app:get-selected-profile-from-cli'),
  selectSteamPathDialog: (): Promise<string | null> => ipcRenderer.invoke('app:select-steam-path-dialog'),

  onProfilesChanged: (callback: () => void) => {
    ipcRenderer.on('profiles:changed', callback);
    return () => {
      ipcRenderer.removeListener('profiles:changed', callback);
    };
  },
  onUnlinkStart: (callback: () => void) => {
    ipcRenderer.on('unlink:start', callback);
    return () => ipcRenderer.removeListener('unlink:start', callback);
  },
  onUnlinkLog: (callback: (log: any) => void) => {
    const handler = (event: IpcRendererEvent, log: any) => callback(log);
    ipcRenderer.on('unlink:log', handler);
    return () => ipcRenderer.removeListener('unlink:log', handler);
  },
  onUnlinkFinish: (callback: (result: any) => void) => {
    const handler = (event: IpcRendererEvent, result: any) => callback(result);
    ipcRenderer.on('unlink:finish', handler);
    return () => ipcRenderer.removeListener('unlink:finish', handler);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);