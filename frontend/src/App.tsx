import { useState, useEffect } from 'react';
import Header from './components/Header';
import ConfigForm from './components/ConfigForm';
import ActionButtons from './components/ActionButtons';
import Footer from './components/Footer';
import LivePreview from './components/LivePreview';

// Interface Movie exportée pour être utilisée dans LivePreview
export interface Movie {
    title: string;
    image: string;
    slug?: string;
    rating?: string;
}

export default function App() {
    const [username, setUsername] = useState('');
    const [sort, setSort] = useState('default');
    const [installUrl, setInstallUrl] = useState('');

    const [isValidating, setIsValidating] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [previewMovies, setPreviewMovies] = useState<Movie[]>([]);

    useEffect(() => {
        if (!username.trim()) {
            setIsValid(null);
            setInstallUrl('');
            setPreviewMovies([]);
            return;
        }

        const validateAndFetch = async () => {
            setIsValidating(true);
            try {
                const res = await fetch(`/api/preview/${username.trim()}`);
                const data = await res.json();

                if (data.success) {
                    setIsValid(true);
                    setPreviewMovies(data.movies);

                    const host = window.location.host;
                    const configObj = { username: username.trim(), sort: sort };
                    const configStr = encodeURIComponent(JSON.stringify(configObj));
                    setInstallUrl(`stremio://${host}/${configStr}/manifest.json`);
                } else {
                    setIsValid(false);
                    setInstallUrl('');
                    setPreviewMovies([]);
                }
            } catch (e) {
                setIsValid(null);
            } finally {
                setIsValidating(false);
            }
        };

        const timeoutId = setTimeout(validateAndFetch, 800);
        return () => clearTimeout(timeoutId);
    }, [username, sort]);

    return (
        <div className="h-[100dvh] bg-[#14181c] text-slate-300 font-sans flex flex-col items-center justify-center p-4 selection:bg-[#00e054] selection:text-black relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00e054] opacity-[0.03] blur-[100px] pointer-events-none rounded-full"></div>

            <div className="max-w-md w-full relative z-10 animate-fade-in-up flex flex-col items-center">
                <Header />
                <div className="bg-[#1c232e] border border-[#2c3440] rounded-2xl p-6 shadow-2xl relative group w-full">
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#2c3440]/50 rounded-2xl transition-colors pointer-events-none"></div>

                    <div className="space-y-4 relative z-10">
                        <ConfigForm
                            username={username}
                            setUsername={setUsername}
                            sort={sort}
                            setSort={setSort}
                            isValidating={isValidating}
                            isValid={isValid}
                        />

                        <LivePreview
                            movies={previewMovies}
                            isLoading={isValidating}
                            username={username}
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