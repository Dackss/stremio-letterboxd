import { Loader2 } from 'lucide-react';

interface MoviePreview {
    title: string;
    image: string;
}

interface LivePreviewProps {
    movies: MoviePreview[];
    isLoading: boolean;
    username: string;
}

export default function LivePreview({ movies, isLoading, username }: LivePreviewProps) {
    if (!username) return null;

    return (
        <div className="mt-4 pt-4 border-t border-[#2c3440] animate-in fade-in duration-500">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-3 flex justify-between items-center">
                Aperçu de ta watchlist
                {isLoading && <Loader2 size={14} className="animate-spin text-[#40bcf4]" />}
            </h3>

            <div className="grid grid-cols-4 gap-3">
                {isLoading ? (
                    // Squelettes de chargement
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-[#14181c] rounded-lg animate-pulse border border-[#2c3440]"></div>
                    ))
                ) : movies.length > 0 ? (
                    movies.slice(0, 4).map((movie, i) => (
                        <div key={i} className="group relative aspect-[2/3] rounded-lg overflow-hidden border border-[#2c3440] shadow-lg hover:border-[#00e054] transition-all">
                            <img
                                src={movie.image}
                                alt={movie.title}
                                referrerPolicy="no-referrer" // 🛠️ FIX : Empêche Letterboxd de bloquer l'image
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                onError={(e) => {
                                    // Optionnel : Image par défaut si le lien est brisé
                                    (e.target as HTMLImageElement).src = 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-[10px] text-white font-bold leading-tight line-clamp-2">{movie.title}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-4 py-4 text-center text-xs text-slate-500 italic">
                        Aucun film trouvé ou liste privée.
                    </div>
                )}
            </div>
        </div>
    );
}