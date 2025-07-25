import Store, { Schema } from 'electron-store';
import { IAppSettings } from '../../shared/types';
import { getAppSettingsFolder } from '../utils/paths';

const schema: Schema<IAppSettings> = {
  steamPath: { type: ['string', 'null'], default: null },
  selectedProfileId: { type: ['string', 'null'], default: 'main' },
  terminateSteam: { type: 'boolean', default: true },
  changeHwid: { type: 'boolean', default: true },
  randomizeMacs: { type: 'boolean', default: true },
  cleanRegedit: { type: 'boolean', default: true },
  changeMguid: { type: 'boolean',default: true },
  startSteam: { type: 'boolean', default: true },
  autoCopySettings: { type: 'boolean', default: false },
  appId: { type: ['string', 'null'], default: null },
  refAccountId: { type: ['string', 'null'], default: null },
  refProfileName: { type: ['string', 'null'], default: null },
};

const store = new Store<IAppSettings>({ schema, name: 'settings', cwd: getAppSettingsFolder() });

export const settingsStore = {
  getSettings: (): IAppSettings => store.store,
  saveSettings: (settings: Partial<IAppSettings>): void => {
    store.set(settings);
  },
  get: <T extends keyof IAppSettings>(key: T): IAppSettings[T] => store.get(key),
  set: <T extends keyof IAppSettings>(key: T, value: IAppSettings[T]): void => {
    store.set(key, value);
  },
};