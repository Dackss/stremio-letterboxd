interface ConfigFormProps {
    username: string;
    setUsername: (value: string) => void;
}

export default function ConfigForm({ username, setUsername }: ConfigFormProps) {
    return (
        <div>
            <label
                htmlFor="username"
                className="block text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2"
            >
                Pseudo Letterboxd
            </label>
            <input
                id="username"
                type="text"
                placeholder="ex: dackss"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#2c3440] text-white placeholder-slate-500 border border-transparent rounded-xl py-4 px-5 focus:outline-none focus:border-[#00e054] focus:ring-1 focus:ring-[#00e054] transition-all duration-200 text-lg"
            />
        </div>
    );
}