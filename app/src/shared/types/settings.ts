export interface IAppSettings {
  steamPath: string | null;
  selectedProfileId: string | null;

  terminateSteam: boolean;
  changeHwid: boolean;
  randomizeMacs: boolean;
  cleanRegedit: boolean;
  changeMguid: boolean;
  startSteam: boolean;

  autoCopySettings: boolean;
  appId: string | null;
  refAccountId: string | null;
  refProfileName: string | null;
}