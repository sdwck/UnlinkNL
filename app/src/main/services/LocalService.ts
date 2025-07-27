import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { IProfile, ISteamAccount } from '../../shared/types';
import { profileStore } from '../store/ProfileStore';
import { IGame } from '../../shared/types';
import { Jimp } from 'jimp';

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
          const avatarPath = await this.findAvatarForProfile(dir.name);
          return {
            id: dir.name,
            name: dir.name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
            steamAccounts: accounts,
            avatar: avatarPath,
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
      const profilesRoot = this.getProfilesRoot();
      await fs.mkdir(profilesRoot, { recursive: true });

      const localDirs = await fs.readdir(profilesRoot, { withFileTypes: true });
      const localProfileIds = new Set(localDirs.filter(d => d.isDirectory()).map(d => d.name));
      const storedProfiles = profileStore.getAll();
      const storedProfilesMap = new Map(storedProfiles.map(p => [p.id, p]));

      const finalProfiles: IProfile[] = [];

      for (const profileId of localProfileIds) {
        const storedVersion = storedProfilesMap.get(profileId);
        const accounts = await this.getAccountsForProfile(profileId);
        const avatarBase64 = await this.getAvatarAsBase64(profileId);

        if (storedVersion) {
          finalProfiles.push({
            ...storedVersion,
            steamAccounts: accounts,
            avatar: avatarBase64,
          });
        } else {
          finalProfiles.push({
            id: profileId,
            name: profileId.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
            steamAccounts: accounts,
            avatar: avatarBase64,
          });
        }
      }

      profileStore.set(finalProfiles);
      this.log('Profile store synchronized with local profile directories.');
    } catch (error) {
      this.log(`Failed to initialize and sync profile store: ${error.message}`);
    }
  }

  public async setProfileAvatar(profileId: string, sourcePath: string): Promise<void> {
    const profileDir = path.join(this.getProfilesRoot(), profileId);
    const destPath = path.join(profileDir, `avatar`);

    try {
      await fs.mkdir(profileDir, { recursive: true });
      const image = await Jimp.read(sourcePath);

      await image
        .cover({ h: 512, w: 512 })
        .write(`${destPath}.jpg`, { quality: 90, progressive: true });

      const base64 = await image.getBase64("image/jpeg", {quality: 90});
      profileStore.update(profileId, { avatar: base64 });
    } catch (error) {
      this.log(`Failed to set avatar for profile ${profileId}: ${error.message}`);
      throw error;
    }
  }

  private async getAvatarAsBase64(profileId: string): Promise<string | null> {
    const profileDir = path.join(this.getProfilesRoot(), profileId);
    try {
      const files = await fs.readdir(profileDir);
      const avatarFile = files.find(file => file.startsWith('avatar.'));
      if (avatarFile) {
        const filePath = path.join(profileDir, avatarFile);
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        const extension = path.extname(avatarFile).slice(1) || 'jpg';
        return `data:image/${extension};base64,${base64}`;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`Error reading avatar for ${profileId}: ${error.message}`);
      }
    }
    return null;
  }

  private async findAvatarForProfile(profileId: string): Promise<string | null> {
    const profileDir = path.join(this.getProfilesRoot(), profileId);
    try {
      const files = await fs.readdir(profileDir);
      const avatarFile = files.find(file => file.startsWith('avatar.'));
      if (avatarFile) {
        const filePath = path.join(profileDir, avatarFile);
        const fileBuffer = await fs.readFile(filePath);
        const base64 = fileBuffer.toString('base64');
        const extension = path.extname(avatarFile).slice(1);
        return `data:image/${extension};base64,${base64}`;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`Error finding avatar for ${profileId}: ${error.message}`);
      }
    }
    return null;
  }
}