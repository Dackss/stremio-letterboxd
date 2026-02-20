import { Loader2, Star, ExternalLink, Film } from 'lucide-react';
import { Movie } from '../App';

interface LivePreviewProps {
    movies: Movie[];
    isLoading: boolean;
    username: string;
}

const generateSlug = (title: string) => {
    return title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
};

export default function LivePreview({ movies, isLoading, username }: LivePreviewProps) {
    const displayMovies = movies.slice(0, 4);
    const hasMovies = displayMovies.length > 0;

    return (
        <div className="mt-4 pt-4 border-t border-[#2c3440] animate-in fade-in duration-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-3 flex justify-between items-center">
                Aperçu de ta watchlist
                {isLoading && <Loader2 size={14} className="animate-spin text-[#40bcf4]" />}
            </h3>

            {isLoading ? (
                // 1. ÉTAT : En cours de recherche ➔ On affiche les squelettes de chargement
                <div className="grid grid-cols-4 gap-2.5 h-[140px]">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-[#2c3440]/30 rounded-xl animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                        </div>
                    ))}
                </div>
            ) : !hasMovies ? (
                // 2. ÉTAT : Aucun film (pseudo vide OU pseudo introuvable) ➔ On affiche l'encart avec l'icône Film
                <div className="h-[140px] bg-[#2c3440]/30 rounded-xl flex flex-col items-center justify-center text-slate-500 gap-2 border border-[#2c3440] p-4 text-center">
                    <Film size={32} className="text-slate-600 mb-1 opacity-80" strokeWidth={1.5} />
                    <p className="text-xs font-medium">
                        {/* Le texte s'adapte subtilement selon si on a tapé quelque chose ou non */}
                        {!username ? "Saisis un pseudo pour voir l'aperçu." : "Aucun film trouvé pour le moment."}
                    </p>
                </div>
            ) : (
                // 3. ÉTAT : Films trouvés ➔ On affiche la grille de posters
                <div className="grid grid-cols-4 gap-2.5">
                    {displayMovies.map((movie, index) => {
                        const finalSlug = (movie.slug && movie.slug !== '') ? movie.slug : generateSlug(movie.title);
                        const uniqueKey = finalSlug + index;
                        const movieLink = `https://letterboxd.com/film/${finalSlug}/`;

                        return (
                            <a
                                key={uniqueKey}
                                href={movieLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative aspect-[2/3] bg-[#2c3440] rounded-xl overflow-hidden shadow-md group/poster hover:shadow-[0_0_20px_rgba(0,224,84,0.2)] hover:ring-2 hover:ring-[#00e054] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#40bcf4]"
                            >
                                <div className="w-full h-full overflow-hidden rounded-xl">
                                    <img
                                        src={movie.image}
                                        alt={movie.title}
                                        referrerPolicy="no-referrer"
                                        className={`w-full h-full object-cover transition-transform duration-500 group-hover/poster:scale-110 opacity-100 blur-0 scale-100`}
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png';
                                        }}
                                    />
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 backdrop-blur-[2px] rounded-xl">
                                    {movie.rating ? (
                                        <div className="flex items-center gap-1.5 mb-1 text-[#00e054] font-black text-lg drop-shadow-md animate-in zoom-in duration-300 delay-75">
                                            <Star size={18} fill="currentColor" strokeWidth={0} />
                                            <span>{movie.rating}</span>
                                        </div>
                                    ) : (
                                        <ExternalLink size={24} className="text-white mb-1 opacity-70 animate-in zoom-in duration-300 delay-75" />
                                    )}

                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/80 animate-in slide-in-from-bottom-2 duration-300 delay-100">
                                        Voir la fiche
                                    </span>

                                    <div className="absolute bottom-2 right-2 text-white/50">
                                        <ExternalLink size={12} />
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                    {/* Squelettes de remplissage si la watchlist contient moins de 4 films */}
                    {[...Array(4 - displayMovies.length)].map((_, i) => (
                        <div key={`skel-${i}`} className="aspect-[2/3] bg-[#2c3440]/50 rounded-xl animate-pulse relative overflow-hidden border border-[#2c3440]">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}