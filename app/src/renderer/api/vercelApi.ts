import { ISteamAccount, IGame } from '../../shared/types';

const API_BASE_URL = 'https://unlink-nl.vercel.app/api/steam';
const CLIENT_KEY = 'a4b8c1d6-e2f3-4a5b-8c9d-0e1f2a3b4c5d';

const fetchWithAuth = (url: string) => {
  return fetch(url, {
    headers: {
      'x-client-key': CLIENT_KEY
    }
  });
};

const vercelApi = {
  getEnrichedAccountData: async (accounts: ISteamAccount[]): Promise<ISteamAccount[]> => {
    const accountIds = accounts.map(a => a.id).join(',');
    if (!accountIds) return [];

    try {
      const response = await fetchWithAuth(`${API_BASE_URL}?type=accounts&ids=${accountIds}`);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const data: any[] = await response.json();
      
      return accounts.map(localAccount => {
        const remoteData = data.find(d => d.id === localAccount.id);
        return {
            ...localAccount,
            steamName: remoteData?.steamName || `User ${localAccount.id}`,
            avatarUrl: remoteData?.avatarUrl || `https://i.pravatar.cc/250?u=${localAccount.id}`,
        };
      });

    } catch (error) {
      console.error('Failed to fetch enriched account data, using defaults:', error);
      return accounts.map(account => ({
          ...account,
          steamName: `User ${account.id}`,
          avatarUrl: `https://i.pravatar.cc/250?u=${account.id}`
      }));
    }
  },

  getEnrichedGameData: async (localGames: IGame[]): Promise<IGame[]> => {
    const gameIds = localGames.map(g => g.id).join(',');
    if (!gameIds) return [];

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}?type=games&ids=${gameIds}`);
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        const data: any[] = await response.json();
        
        return localGames.map(localGame => {
            const remoteData = data.find(d => d.id === localGame.id);
            const name = remoteData?.name || `Game ${localGame.id}`;
            return {
                ...localGame,
                name: name,
                imageUrl: remoteData?.imageUrl || `https://api.dicebear.com/9.x/icons/svg?seed=${name}`,
            };
        });

    } catch(error) {
        console.error('Failed to fetch enriched game data, using defaults:', error);
        return localGames.map(game => {
          const name = `Game ${game.id}`;
          return {
            ...game,
            name: name,
            imageUrl: `https://api.dicebear.com/9.x/icons/svg?seed=${name}`
          }
        });
    }
  },
};

export default vercelApi;