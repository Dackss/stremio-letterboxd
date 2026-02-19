const axios = require('axios');
const cheerio = require('cheerio');

async function getWatchlist(username) {
    const url = `https://letterboxd.com/${username}/watchlist/`;
    console.log(`🔍 Scraping de : ${url}`);

    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const movies = [];

        // On cherche tous les posters de films
        $('.film-poster').each((i, element) => {
            const el = $(element);
            const slug = el.attr('data-film-slug');
            const name = el.attr('data-film-name') || el.find('img').attr('alt');
            let poster = el.find('img').attr('src');

            if (slug) {
                // Nettoyage de l'URL du poster si besoin
                if (poster && poster.includes('?')) poster = poster.split('?')[0];

                movies.push({
                    id: `lb:${slug}`,
                    type: 'movie',
                    name: name || slug,
                    poster: poster,
                    description: `Dans la watchlist de ${username}`
                });
            }
        });

        if (movies.length === 0) {
            console.log("⚠️ Liste vide ou privée. Vérifie ton profil Letterboxd !");
        } else {
            console.log(`✅ ${movies.length} films trouvés.`);
        }

        return movies;

    } catch (error) {
        console.error(`❌ Erreur réseau : ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };