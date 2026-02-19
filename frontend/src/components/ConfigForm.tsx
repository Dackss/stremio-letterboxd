import { ListFilter } from 'lucide-react';

interface ConfigFormProps {
    username: string;
    setUsername: (value: string) => void;
    sort: string;
    setSort: (value: string) => void;
}

export default function ConfigForm({ username, setUsername, sort, setSort }: ConfigFormProps) {
    return (
        <div className="space-y-5">
            {/* Input Pseudo */}
            <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">
                    Pseudo Letterboxd
                </label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#2c3440] text-white placeholder-slate-600 border border-transparent rounded-xl py-4 px-5 focus:outline-none focus:border-[#00e054] focus:ring-1 focus:ring-[#00e054] transition-all duration-200 text-lg"
                />
            </div>

            {/* Select Tri */}
            <div>
                <label htmlFor="sort" className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2">
                    <ListFilter size={14} />
                    Ordre de la Watchlist
                </label>
                <div className="relative">
                    <select
                        id="sort"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="w-full bg-[#2c3440] text-white border border-transparent rounded-xl py-4 px-5 appearance-none focus:outline-none focus:border-[#40bcf4] focus:ring-1 focus:ring-[#40bcf4] transition-all duration-200 text-base cursor-pointer"
                    >
                        <option value="default">Ordre d'ajout (Défaut)</option>
                        <option value="popular">Les plus populaires</option>
                        <option value="rating">Les mieux notés</option>
                        <option value="release">Date de sortie (Nouveautés)</option>
                        <option value="shortest">Durée (Les plus courts)</option>
                    </select>
                    {/* Icône flèche personnalisée */}
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        </div>
    );
}