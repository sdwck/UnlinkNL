export interface ISteamAccount {
  id: string;
  steamId: string;
  steamName?: string;
  avatarUrl?: string;
}

export interface IProfile {
  id: string;
  name: string;
  steamAccounts: ISteamAccount[];
  avatar?: string | null;
}