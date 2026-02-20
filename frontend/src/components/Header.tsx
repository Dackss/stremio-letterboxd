export default function Header() {
    return (
        <div className="text-center mb-4 select-none">
            <div className="flex justify-center gap-1.5 mb-3 group cursor-default">
                <div className="w-3 h-3 rounded-full bg-[#00e054] transition-transform duration-300 group-hover:scale-125"></div>
                <div className="w-3 h-3 rounded-full bg-[#40bcf4] transition-transform duration-300 delay-75 group-hover:scale-125"></div>
                <div className="w-3 h-3 rounded-full bg-[#ff8000] transition-transform duration-300 delay-150 group-hover:scale-125"></div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white drop-shadow-md">
                Letterboxd <span className="text-[#00e054]">Stremio</span>
            </h1>
            <p className="mt-2 text-xs text-slate-400 font-medium tracking-wide leading-relaxed">
                Connecte ta watchlist et affiche tes films<br/>directement dans ton catalogue.
            </p>
        </div>
    );
}