const axios = require('axios');
const cheerio = require('cheerio');

// Fonction pour récupérer les infos Cinemeta
async function getStremioMeta(fullName) {
    try {
        const cleanTitle = fullName.replace(/\s\(\d{4}\)$/, '').trim().toLowerCase();
        const searchUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`;
        const res = await axios.get(searchUrl, { timeout: 2000 });
        const meta = res.data.metas && res.data.metas[0];
        return meta || null;
    } catch (e) { return null; }
}

async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    const cleanUsername = username.toLowerCase().trim();

    let baseUrl = `https://letterboxd.com/${cleanUsername}/watchlist/`;
    if (sort === 'popular') baseUrl += 'by/popular/';
    if (sort === 'rating') baseUrl += 'by/rating/';
    if (sort === 'release') baseUrl += 'by/release/'; // FIX: 'release' et non 'release-newest'
    if (sort === 'shortest') baseUrl += 'by/shortest/';

    console.log(`[Scraper] Scraping: ${baseUrl}`);

    try {
        // On se limite à la PAGE 1 pour éviter le Timeout Stremio
        const { data } = await axios.get(baseUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 5000
        });

        const $ = cheerio.load(data);
        const posters = $('.film-poster');

        posters.each((i, element) => {
            const slug = $(element).attr('data-film-slug');
            const name = $(element).find('img').attr('alt');
            if (slug && name) allRawMovies.push({ slug, name });
        });

        console.log(`[Scraper] ${allRawMovies.length} films trouvés.`);

        // On traite les 20 premiers films pour rester sous les 10s de timeout
        const movies = [];
        const limitedList = allRawMovies.slice(0, 20);

        for (const raw of limitedList) {
            const meta = await getStremioMeta(raw.name);
            if (meta) {
                movies.push({ ...meta, type: 'movie' });
            } else {
                movies.push({
                    id: `lb:${raw.slug}`,
                    name: raw.name,
                    type: 'movie',
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png'
                });
            }
        }
        return movies;

    } catch (error) {
        console.error(`[Scraper] Erreur: ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };