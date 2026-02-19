export default function Header() {
    return (
        <div className="text-center mb-8">
            <div className="flex justify-center gap-1 mb-4">
                <div className="w-3 h-3 rounded-full bg-[#00e054]"></div>
                <div className="w-3 h-3 rounded-full bg-[#40bcf4]"></div>
                <div className="w-3 h-3 rounded-full bg-[#ff8000]"></div>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
                Letterboxd <span className="text-[#00e054]">Stremio</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 font-medium tracking-wide">
                Affiche ta watchlist directement dans ton catalogue Stremio.
            </p>
        </div>
    );
}