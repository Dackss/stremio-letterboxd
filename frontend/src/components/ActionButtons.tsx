import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface ActionButtonsProps {
    username: string;
    installUrl: string;
}

export default function ActionButtons({ username, installUrl }: ActionButtonsProps) {
    const [copied, setCopied] = useState(false);

    const handleInstall = () => {
        if (installUrl) window.location.href = installUrl;
    };

    const handleCopy = () => {
        if (installUrl) {
            // On force le HTTPS pour la copie de l'URL
            const webUrl = installUrl.replace('stremio://', 'https://');
            navigator.clipboard.writeText(webUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-3 pt-2">
            <button
                onClick={handleInstall}
                disabled={!username}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed
          ${username
                    ? 'bg-[#00e054] text-[#14181c] hover:bg-[#00c94b] shadow-[0_0_20px_rgba(0,224,84,0.2)] hover:shadow-[0_0_25px_rgba(0,224,84,0.4)] hover:-translate-y-0.5'
                    : 'bg-[#2c3440] text-slate-500'
                }`}
            >
                <Download size={20} strokeWidth={2.5} />
                Installer sur Stremio
            </button>

            <button
                onClick={handleCopy}
                disabled={!username}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed
          ${username
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
                        Copier le lien
                    </>
                )}
            </button>
        </div>
    );
}