import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { IProfile, ISteamAccount } from '../../shared/types';
import { profileStore } from '../store/ProfileStore';
import { IGame } from '../../shared/types';

export class LocalService {
  constructor(private mainWindow: BrowserWindow) { }

  private getProfilesRoot(): string {
    return path.join(app.getPath('appData'), 'NL', 'Unlink', 'profiles');
  }

  private log(message: string) {
    this.mainWindow.webContents.send('unlink:log', { level: 'Information', message: `[LocalService] ${message}` });
  }

  public async getAccountsForProfile(profileId: string): Promise<ISteamAccount[]> {
    const userdataPath = path.join(this.getProfilesRoot(), profileId, 'userdata');
    try {
      const accountFolders = await fs.readdir(userdataPath, { withFileTypes: true });
      return accountFolders
        .filter(f => f.isDirectory() && /^\d+$/.test(f.name) && f.name !== '0')
        .map(account => ({
          id: account.name,
          steamId: account.name,
        }));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`Error reading accounts for profile '${profileId}': ${error.message}`);
      }
      return [];
    }
  }

  public async getLocalProfiles(): Promise<IProfile[]> {
    const profilesRoot = this.getProfilesRoot();
    try {
      await fs.mkdir(profilesRoot, { recursive: true });
      const entries = await fs.readdir(profilesRoot, { withFileTypes: true });
      const profileDirs = entries.filter(entry => entry.isDirectory());

      const profiles: IProfile[] = await Promise.all(
        profileDirs.map(async (dir): Promise<IProfile> => {
          const accounts = await this.getAccountsForProfile(dir.name);
          return {
            id: dir.name,
            name: dir.name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
            steamAccounts: accounts
          };
        })
      );
      return profiles;
    } catch (error) {
      this.log(`Error reading local profiles: ${error.message}`);
      return [];
    }
  }

  public async getGamesForAccount(profileId: string, accountId: string): Promise<IGame[]> {
    const accountPath = path.join(this.getProfilesRoot(), profileId, 'userdata', accountId);
    try {
      const gameFolders = await fs.readdir(accountPath, { withFileTypes: true });
      return gameFolders
        .filter(f => f.isDirectory() && /^\d+$/.test(f.name))
        .map(game => ({
          id: game.name,
          name: '',
          imageUrl: '',
        }));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`Error reading games for account '${accountId}': ${error.message}`);
      }
      return [];
    }
  }

  public async initializeProfiles() {
    try {
      const localProfiles = await this.getLocalProfiles();
      const storedProfiles = profileStore.getAll();
      const storedProfilesMap = new Map(storedProfiles.map(p => [p.id, p]));

      const finalProfiles = localProfiles.map(localProfile => {
        const storedVersion = storedProfilesMap.get(localProfile.id);

        if (storedVersion) {
          return {
            ...storedVersion,
            steamAccounts: localProfile.steamAccounts,
          };
        } else {
          return localProfile;
        }
      });

      profileStore.set(finalProfiles);
      this.log('Profile store synchronized with local profile directories.');
    } catch (error) {
      this.log(`Failed to initialize and sync profile store: ${error.message}`);
    }
  }

  public async setProfileAvatar(profileId: string, sourcePath: string): Promise<string> {
    const profileDir = path.join(this.getProfilesRoot(), profileId);
    const extension = path.extname(sourcePath);
    const destPath = path.join(profileDir, `avatar${extension}`);

    try {
      await fs.copyFile(sourcePath, destPath);
      return destPath;
    } catch (error) {
      this.log(`Failed to set avatar for profile ${profileId}: ${error.message}`);
      throw error;
    }
  }
}