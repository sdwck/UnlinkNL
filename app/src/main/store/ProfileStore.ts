import { Schema } from 'electron-store';
import { IProfile } from '../../shared/types';
import crypto from 'crypto';
import Store from 'electron-store';
import { getAppSettingsFolder } from '../utils/paths';

interface ProfileStoreSchema {
  profiles: IProfile[];
}

const schema: Schema<ProfileStoreSchema> = {
  profiles: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        steamAccounts: { type: 'array', default: [] },
        avatar: { type: ['string', 'null'], default: null }
      },
      required: ['id', 'name'],
    },
  },
};

const store = new Store({ schema, name: 'profiles', cwd: getAppSettingsFolder() });

const profileStore = {
  getAll: (): IProfile[] => store.get('profiles'),

  add: (profile: IProfile): IProfile => {
    const profiles = store.get('profiles');
    profiles.push(profile);
    store.set('profiles', profiles);
    return profile;
  },

  set: (profiles: IProfile[]): void => {
    store.set('profiles', profiles);
  },

  delete: (profileId: string): void => {
    const profiles = store.get('profiles').filter((p: IProfile) => p.id !== profileId);
    store.set('profiles', profiles);
  },

  deleteAccount: (profileId: string, accountId: string): void => {
    const profiles = store.get('profiles').map((profile: IProfile) =>
      profile.id === profileId
        ? { ...profile, steamAccounts: profile.steamAccounts.filter(account => account.id !== accountId) }
        : profile
    );
    store.set('profiles', profiles);
  },

  update: (profileId: string, updates: Partial<IProfile>): void => {
    const profiles = store.get('profiles');
    const profileIndex = profiles.findIndex(p => p.id === profileId);
    if (profileIndex !== -1) {
      profiles[profileIndex] = { ...profiles[profileIndex], ...updates };
      store.set('profiles', profiles);
    }
  },
};

export { profileStore };