const axios = require('axios');
const cheerio = require('cheerio');

async function getStremioMeta(fullName) {
    try {
        const cleanTitle = fullName.replace(/\s\(\d{4}\)$/, '').trim().toLowerCase();
        const yearMatch = fullName.match(/\((\d{4})\)$/);
        const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

        const movieSearchUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`;
        const seriesSearchUrl = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(cleanTitle)}.json`;

        const [movieRes, seriesRes] = await Promise.all([
            axios.get(movieSearchUrl).catch(() => ({ data: { metas: [] } })),
            axios.get(seriesSearchUrl).catch(() => ({ data: { metas: [] } }))
        ]);

        const allMetas = [...(movieRes.data.metas || []), ...(seriesRes.data.metas || [])];

        if (allMetas.length > 0) {
            let bestMatch = null;
            if (targetYear) {
                bestMatch = allMetas.find(m => {
                    const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : '0'), 10);
                    return m.name.toLowerCase() === cleanTitle && Math.abs(metaYear - targetYear) <= 1;
                });
            }
            if (!bestMatch) bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle) || allMetas[0];

            if (bestMatch && bestMatch.id) {
                try {
                    const detailRes = await axios.get(`https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`);
                    return detailRes.data.meta || bestMatch;
                } catch (e) { return bestMatch; }
            }
            return bestMatch;
        }
    } catch (e) { return null; }
    return null;
}

async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    const cleanUsername = username.toLowerCase().trim();

    let baseUrl = `https://letterboxd.com/${cleanUsername}/watchlist/`;
    if (sort === 'popular') baseUrl += 'by/popular/';
    if (sort === 'rating') baseUrl += 'by/rating/';
    if (sort === 'release') baseUrl += 'by/release/';
    if (sort === 'shortest') baseUrl += 'by/shortest/';

    console.log(`[DEBUG] Tentative de scraping sur : ${baseUrl}`);

    try {
        const { data, status } = await axios.get(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': 'https://letterboxd.com/',
                'DNT': '1'
            },
            timeout: 10000
        });

        console.log(`[DEBUG] Statut HTTP : ${status}`);

        const $ = cheerio.load(data);
        const posters = $('.film-poster');

        console.log(`[DEBUG] Nombre de posters trouvés sur la page : ${posters.length}`);

        if (posters.length === 0) {
            // Si on ne trouve rien, on affiche un bout du HTML pour comprendre
            console.log(`[DEBUG] HTML reçu (500 premiers caractères) : ${data.substring(0, 500)}`);
        }

        posters.each((i, element) => {
            const slug = $(element).attr('data-film-slug');
            const name = $(element).find('img').attr('alt') || (slug ? slug.replace(/-/g, ' ') : null);
            if (slug && name) allRawMovies.push({ slug, name });
        });

        // Conversion Cinemeta (on limite à 20 pour tester vite)
        const movies = await Promise.all(allRawMovies.slice(0, 20).map(async (raw) => {
            const meta = await getStremioMeta(raw.name);
            return meta ? { ...meta, type: meta.type || 'movie' } : { id: `lb:${raw.slug}`, type: 'movie', name: raw.name, poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png' };
        }));

        return movies;

    } catch (error) {
        if (error.response) {
            console.error(`[ERREUR] Letterboxd a répondu ${error.response.status}. C'est probablement Cloudflare qui bloque.`);
        } else {
            console.error(`[ERREUR] Erreur de connexion : ${error.message}`);
        }
        return [];
    }
}

module.exports = { getWatchlist };