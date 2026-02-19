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

            // CORRECTION : On utilise un véritable objet JSON pour la config
            const configObj = {
                username: username.trim(),
                sort: sort
            };

            // On encode l'objet en format URL sécurisé
            const configStr = encodeURIComponent(JSON.stringify(configObj));
            setInstallUrl(`stremio://${host}/${configStr}/manifest.json`);
        } else {
            setInstallUrl('');
        }
    }, [username, sort]);

    return (
        <div className="min-h-screen bg-[#14181c] text-slate-300 font-sans flex flex-col items-center justify-center p-6">
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