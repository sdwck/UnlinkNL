import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const cache = new Map<string, { data: any, expiry: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000;

const STEAM_ID_64_BASE = BigInt('76561197960265728');

const handler = async (req: VercelRequest, res: VercelResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { type, ids } = req.query;
    const STEAM_API_KEY = process.env.STEAM_API_KEY;

    if (!STEAM_API_KEY) {
        return res.status(500).json({ error: 'STEAM_API_KEY is not configured on the server.' });
    }
    if (!type || !ids || typeof ids !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid parameters. "type" and "ids" are required.' });
    }
    
    const cacheKey = `${type}:${ids}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        return res.status(200).json(cached.data);
    }

    try {
        let data;
        if (type === 'accounts') {
            const accountIds32 = ids.split(',');
            const accountIds64 = accountIds32.map(id => (BigInt(id) + STEAM_ID_64_BASE).toString());
            const reverseIdMap = new Map<string, string>();
            accountIds64.forEach((id64, index) => {
                reverseIdMap.set(id64, accountIds32[index]);
            });
            
            const idsForApi = accountIds64.join(',');
            const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${idsForApi}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Steam API returned ${response.status}`);
            
            const result: any = await response.json();
            
            data = result.response.players.map((player: any) => {
                const originalId = reverseIdMap.get(player.steamid);
                return {
                    id: originalId,
                    steamId: player.steamid,
                    steamName: player.personaname,
                    avatarUrl: player.avatarfull,
                }
            });

        } else if (type === 'games') {
            const appIds = ids.split(',');
            const gamePromises = appIds.map(async (id) => {
                const url = `https://store.steampowered.com/api/appdetails?appids=${id}`;
                const response = await fetch(url);
                const result: any = await response.json();
                if (result[id] && result[id].success) {
                    return { id: id, name: result[id].data.name, imageUrl: result[id].data.header_image };
                }
                return { id, name: null, imageUrl: null };
            });
            data = await Promise.all(gamePromises);
            
        } else {
            return res.status(400).json({ error: 'Invalid "type" parameter. Use "accounts" or "games".' });
        }
        
        cache.set(cacheKey, { data, expiry: Date.now() + CACHE_DURATION_MS });
        res.setHeader('Cache-Control', `s-maxage=${CACHE_DURATION_MS / 1000}`);
        return res.status(200).json(data);

    } catch (error: any) {
        console.error(error);
        return res.status(502).json({ error: 'Failed to fetch data from Steam API.', details: error.message });
    }
};

export default handler;