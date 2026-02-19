import { useState, useEffect } from 'react';
import Header from './components/Header';
import ConfigForm from './components/ConfigForm';
import ActionButtons from './components/ActionButtons';
import Footer from './components/Footer';

export default function App() {
    const [username, setUsername] = useState('');
    const [sort, setSort] = useState('default');
    const [installUrl, setInstallUrl] = useState('');

    useEffect(() => {
        if (username.trim()) {
            const host = window.location.host;

            // Création d'un objet de configuration propre pour Stremio
            const configObj: Record<string, string> = { username: username.trim() };

            if (sort !== 'default') {
                configObj.sort = sort;
            }

            const configStr = encodeURIComponent(JSON.stringify(configObj));

            setInstallUrl(`stremio://${host}/${configStr}/manifest.json`);
        } else {
            setInstallUrl('');
        }
    }, [username, sort]);

    return (
        <div className="min-h-screen bg-[#14181c] text-slate-300 font-sans flex flex-col items-center justify-center p-6 selection:bg-[#00e054] selection:text-[#14181c]">
            <div className="max-w-md w-full">
                <Header />

                <div className="bg-[#1c232e] border border-[#2c3440] rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <ConfigForm username={username} setUsername={setUsername} sort={sort} setSort={setSort} />
                        <ActionButtons username={username} installUrl={installUrl} />
                    </div>
                </div>

                <Footer />
            </div>
        </div>
    );
}