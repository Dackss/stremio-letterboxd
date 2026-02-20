import { useState } from 'react';
import { Download, Copy, Check, UserPlus, AlertCircle, Loader2, Info, X } from 'lucide-react';

interface ActionButtonsProps {
    username: string;
    installUrl: string;
    isValidating: boolean;
    isValid: boolean | null;
}

export default function ActionButtons({ username, installUrl, isValidating, isValid }: ActionButtonsProps) {
    const [copied, setCopied] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // 1. Ouvre uniquement la modale
    const handleOpenModal = () => {
        if (installUrl) setShowModal(true);
    };

    // 2. Lance l'installation ET ferme la modale quand on clique sur "J'ai compris"
    const handleConfirmInstall = () => {
        if (installUrl) {
            window.location.href = installUrl;
            setShowModal(false);
        }
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
        <div className="space-y-3 pt-4 border-t border-[#2c3440]">

            {/* Bouton d'installation principal (ouvre juste la modale) */}
            <button
                onClick={handleOpenModal}
                disabled={isDisabled}
                className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed text-sm
        ${!isDisabled
                    ? 'bg-[#00e054] text-[#14181c] hover:bg-[#00c94b] shadow-[0_0_15px_rgba(0,224,84,0.3)] hover:shadow-[0_0_25px_rgba(0,224,84,0.5)] hover:-translate-y-1'
                    : 'bg-[#2c3440] text-slate-500'
                }`}
            >
                <ButtonIcon size={18} strokeWidth={2.5} className={isValidating ? "animate-spin" : ""} />
                {buttonText}
            </button>

            {/* Bouton pour copier le lien */}
            <button
                onClick={handleCopy}
                disabled={isDisabled}
                className={`w-full py-2 rounded-xl font-semibold text-[13px] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed
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

            {/* POP-UP (Modale) d'instructions */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1c232e] border border-[#2c3440] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">

                        {/* Bouton fermer (ferme sans installer) */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-[#ff8000]/10 rounded-full">
                                <Info size={24} className="text-[#ff8000]" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Installation en cours</h3>
                        </div>

                        <div className="text-sm text-slate-300 space-y-4 leading-relaxed">
                            <p className="flex gap-2">
                                <strong className="text-white mt-0.5">1.</strong>
                                <span>Vérifiez que votre watchlist Letterboxd est bien <span className="text-[#00e054] font-medium">publique</span>.</span>
                            </p>
                            <p className="flex gap-2">
                                <strong className="text-white mt-0.5">2.</strong>
                                <span>Sur Stremio, allez dans la rubrique <span className="text-white font-medium">Découvrir ➔ Films ➔ Ma Watchlist Letterboxd</span>.</span>
                            </p>
                            <p className="flex gap-2">
                                <strong className="text-white mt-0.5">3.</strong>
                                <span>Lors du 1er chargement, <span className="text-[#ff8000] font-semibold">attendez environ 1 minute</span> pour laisser le temps au serveur de récupérer vos films.</span>
                            </p>
                        </div>

                        {/* Bouton "J'ai compris" (lance l'installation) */}
                        <button
                            onClick={handleConfirmInstall}
                            className="mt-6 w-full py-3 bg-[#00e054] hover:bg-[#00c94b] text-[#14181c] rounded-xl font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(0,224,84,0.2)] hover:shadow-[0_0_20px_rgba(0,224,84,0.4)] cursor-pointer"
                        >
                            J'ai compris, installer
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}