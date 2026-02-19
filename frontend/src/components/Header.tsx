export default function Header() {
    return (
        <div className="text-center mb-8 select-none">
            <div className="flex justify-center gap-1.5 mb-5 group cursor-default">
                <div className="w-3 h-3 rounded-full bg-[#00e054] transition-transform duration-300 group-hover:scale-125"></div>
                <div className="w-3 h-3 rounded-full bg-[#40bcf4] transition-transform duration-300 delay-75 group-hover:scale-125"></div>
                <div className="w-3 h-3 rounded-full bg-[#ff8000] transition-transform duration-300 delay-150 group-hover:scale-125"></div>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-md">
                Letterboxd <span className="text-[#00e054]">Stremio</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400 font-medium tracking-wide leading-relaxed">
                Connecte ta watchlist et affiche tes films<br/>directement dans ton catalogue.
            </p>
        </div>
    );
}