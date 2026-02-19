const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Ajout du plugin Stealth pour contourner Cloudflare
puppeteer.use(StealthPlugin());

// ... (Garde ta fonction getStremioMeta intacte ici, car l'API cinemeta d'axios fonctionne toujours)
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

                if (!bestMatch) {
                    bestMatch = allMetas.find(m => {
                        const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : '0'), 10);
                        return Math.abs(metaYear - targetYear) <= 1;
                    });
                }
            }

            if (!bestMatch) {
                bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle);
            }

            if (!bestMatch) {
                bestMatch = allMetas[0];
            }

            if (bestMatch && bestMatch.id) {
                try {
                    const detailUrl = `https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`;
                    const detailRes = await axios.get(detailUrl);
                    if (detailRes.data && detailRes.data.meta) {
                        return detailRes.data.meta;
                    }
                } catch (e) {
                    return bestMatch;
                }
            }
            return bestMatch;
        }
    } catch (e) {
        return null;
    }
    return null;
}

async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    const cleanUsername = username.toLowerCase().trim();
    console.log(`[Scraper] Récupération de la watchlist de ${cleanUsername} (Tri: ${sort}) avec Puppeteer`);

    let baseUrl = `https://letterboxd.com/${cleanUsername}/watchlist/`;
    if (sort === 'popular') baseUrl += 'by/popular/';
    if (sort === 'rating') baseUrl += 'by/rating/';
    if (sort === 'release') baseUrl += 'by/release-newest/';
    if (sort === 'shortest') baseUrl += 'by/shortest/';

    // Lancement du navigateur Puppeteer
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const pageBrowser = await browser.newPage();

        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
            console.log(`[Scraper] Analyse de ${pageUrl}...`);

            try {
                // On navigue vers la page et on attend qu'elle soit chargée
                await pageBrowser.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Petit délai aléatoire pour simuler un humain et laisser Cloudflare valider
                await pageBrowser.waitForTimeout(2000 + Math.random() * 2000);

                // Récupération du HTML généré
                const content = await pageBrowser.content();
                const $ = cheerio.load(content);
                const posters = $('.film-poster');

                if (posters.length === 0) {
                    hasMore = false;
                } else {
                    posters.each((i, element) => {
                        const slug = $(element).attr('data-film-slug');
                        const name = $(element).find('img').attr('alt') || (slug ? slug.replace(/-/g, ' ') : null);
                        if (slug && name) allRawMovies.push({ slug, name });
                    });
                    page++;
                }
            } catch (err) {
                console.error(`[Erreur Puppeteer] Échec sur ${pageUrl} :`, err.message);
                hasMore = false;
            }
        }

        // Fermeture du navigateur
        await browser.close();

        console.log(`[Scraper] ${allRawMovies.length} films trouvés.`);
        console.log(`[Cinemeta] Synchronisation des métadonnées en cours...`);

        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {
                const meta = await getStremioMeta(raw.name);

                if (meta) {
                    return {
                        ...meta,
                        type: meta.type || 'movie',
                        posterShape: 'poster'
                    };
                }

                return {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png',
                    posterShape: 'poster',
                    description: 'Information non trouvée sur Cinemeta'
                };
            }));
            movies.push(...batchResults);
        }

        console.log(`[Cinemeta] Synchronisation terminée (${movies.length} films).`);
        return movies;

    } catch (error) {
        console.error(`[Erreur globale] Échec du scraping : ${error.message}`);
        await browser.close();
        return [];
    }
}

module.exports = { getWatchlist };