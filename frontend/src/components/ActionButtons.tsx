import { useState } from 'react';
import { Download, Copy, Check, UserPlus, AlertCircle, Loader2, Info } from 'lucide-react';

interface ActionButtonsProps {
    username: string;
    installUrl: string;
    isValidating: boolean;
    isValid: boolean | null;
}

export default function ActionButtons({ username, installUrl, isValidating, isValid }: ActionButtonsProps) {
    const [copied, setCopied] = useState(false);

    const handleInstall = () => {
        if (installUrl) window.location.href = installUrl;
    };

    const handleCopy = () => {
        if (installUrl) {
            const webUrl = installUrl.replace('stremio://', 'https://');
            navigator.clipboard.writeText(webUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const isDisabled = !username || isValidating || isValid === false;

    let ButtonIcon = Download;
    let buttonText = "Installer sur Stremio";

    if (!username) {
        ButtonIcon = UserPlus;
        buttonText = "Entrez un pseudo";
    } else if (isValidating) {
        ButtonIcon = Loader2;
        buttonText = "Vérification...";
    } else if (isValid === false) {
        ButtonIcon = AlertCircle;
        buttonText = "Pseudo introuvable";
    }

    return (
        <div className="space-y-5 pt-5 border-t border-[#2c3440]">

            {/* Boutons d'action principaux */}
            <div className="space-y-3">
                <button
                    onClick={handleInstall}
                    disabled={isDisabled}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed
            ${!isDisabled
                        ? 'bg-[#00e054] text-[#14181c] hover:bg-[#00c94b] shadow-[0_0_15px_rgba(0,224,84,0.3)] hover:shadow-[0_0_25px_rgba(0,224,84,0.5)] hover:-translate-y-1'
                        : 'bg-[#2c3440] text-slate-500'
                    }`}
                >
                    <ButtonIcon size={20} strokeWidth={2.5} className={isValidating ? "animate-spin" : ""} />
                    {buttonText}
                </button>

                <button
                    onClick={handleCopy}
                    disabled={isDisabled}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed
            ${!isDisabled
                        ? 'text-slate-400 hover:text-white hover:bg-[#2c3440]'
                        : 'text-transparent'
                    }`}
                >
                    {copied ? (
                        <span className="text-[#40bcf4] flex items-center gap-2">
                            <Check size={16} strokeWidth={2.5} />
                            Lien copié !
                        </span>
                    ) : (
                        <>
                            <Copy size={16} strokeWidth={2} />
                            Copier le lien d'installation
                        </>
                    )}
                </button>
            </div>

            {/* Encart d'instructions (Apparaît UNIQUEMENT quand le pseudo est valide) */}
            {isValid === true && (
                <div className="p-4 bg-[#14181c] border border-[#2c3440] rounded-xl flex gap-3 text-left shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
                    <Info size={20} className="text-[#ff8000] shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                        <p>
                            <strong className="text-slate-300">1.</strong> Vérifiez que votre watchlist Letterboxd est bien <span className="text-[#00e054] font-medium">publique</span>.
                        </p>
                        <p>
                            <strong className="text-slate-300">2.</strong> Sur Stremio, allez dans <span className="text-slate-300 font-medium">Découvrir ➔ Films ➔ Ma Watchlist Letterboxd</span>.
                        </p>
                        <p>
                            <strong className="text-slate-300">3.</strong> Lors du 1er chargement, <span className="text-[#ff8000] font-semibold">attendez environ 1 minute</span> pour la récupération de vos films.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
}