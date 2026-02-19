import { useState, useEffect } from 'react';
import Header from './components/Header';
import ConfigForm from './components/ConfigForm';
import ActionButtons from './components/ActionButtons';
import Footer from './components/Footer';

export default function App() {
    const [username, setUsername] = useState('');
    const [sort, setSort] = useState('default');
    const [installUrl, setInstallUrl] = useState('');

    // États pour la validation
    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);

    useEffect(() => {
        if (!username.trim()) {
            setIsValid(null);
            setInstallUrl('');
            return;
        }

        const validateUsername = async () => {
            setIsValidating(true);
            try {
                const targetUrl = `https://letterboxd.com/${username.trim()}/rss/`;
                const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
                const data = await res.json();

                if (data.status && data.status.http_code === 200) {
                    setIsValid(true);
                    const host = window.location.host;
                    const configObj = { username: username.trim(), sort: sort };
                    const configStr = encodeURIComponent(JSON.stringify(configObj));
                    setInstallUrl(`stremio://${host}/${configStr}/manifest.json`);
                } else {
                    setIsValid(false);
                    setInstallUrl('');
                }
            } catch (e) {
                setIsValid(true);
            } finally {
                setIsValidating(false);
            }
        };

        const timeoutId = setTimeout(validateUsername, 800);
        return () => clearTimeout(timeoutId);
    }, [username, sort]);

    return (
        // 1. CORRECTION ICI : Remplacement de overflow-hidden par overflow-x-hidden sur le conteneur global
        <div className="min-h-screen bg-[#14181c] text-slate-300 font-sans flex flex-col items-center justify-center p-6 selection:bg-[#00e054] selection:text-black relative overflow-x-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00e054] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"></div>

            <div className="max-w-md w-full relative z-10 animate-fade-in-up">
                <Header />
                {/* 2. CORRECTION ICI : Suppression de overflow-hidden sur la carte principale */}
                <div className="bg-[#1c232e] border border-[#2c3440] rounded-2xl p-8 shadow-2xl relative group">
                    {/* Le pointer-events-none et rounded-2xl suffisent pour l'effet de bordure sans bloquer le contenu */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#2c3440]/50 rounded-2xl transition-colors pointer-events-none"></div>

                    <div className="space-y-6 relative z-10">
                        <ConfigForm
                            username={username}
                            setUsername={setUsername}
                            sort={sort}
                            setSort={setSort}
                            isValidating={isValidating}
                            isValid={isValid}
                        />
                        <ActionButtons
                            username={username}
                            installUrl={installUrl}
                            isValidating={isValidating}
                            isValid={isValid}
                        />
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}