import { useState, useRef, useEffect } from 'react';
import {
    ListFilter, User, ChevronDown, CheckCircle2, XCircle, Loader2,
    Clock, Flame, Star, Calendar, Hourglass, Check
} from 'lucide-react';

interface ConfigFormProps {
    username: string;
    setUsername: (value: string) => void;
    sort: string;
    setSort: (value: string) => void;
    isValidating: boolean;
    isValid: boolean | null;
}

const SORT_OPTIONS = [
    { id: 'default', label: "Ordre d'ajout (Défaut)", icon: Clock },
    { id: 'popular', label: "Les plus populaires", icon: Flame },
    { id: 'rating', label: "Les mieux notés", icon: Star },
    { id: 'release', label: "Date de sortie", icon: Calendar },
    { id: 'shortest', label: "Durée (Les plus courts)", icon: Hourglass },
];

export default function ConfigForm({ username, setUsername, sort, setSort, isValidating, isValid }: ConfigFormProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = SORT_OPTIONS.find(opt => opt.id === sort) || SORT_OPTIONS[0];
    const SelectedIcon = selectedOption.icon;

    return (
        <div className="space-y-6">
            {/* Input Pseudo */}
            <div className="group">
                <div className="flex justify-between items-end mb-2">
                    <label htmlFor="username" className="block text-xs font-bold text-slate-500 uppercase tracking-[0.15em] group-focus-within:text-[#00e054] transition-colors">
                        Pseudo Letterboxd
                    </label>
                    {isValid === false && username && !isValidating && (
                        <span className="text-xs font-semibold text-red-400">Profil introuvable</span>
                    )}
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User size={18} className={`transition-colors ${isValid === false && !isValidating ? 'text-red-400' : 'text-slate-500 group-focus-within:text-[#00e054]'}`} />
                    </div>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`w-full bg-[#14181c] text-white rounded-xl py-3.5 pl-11 pr-12 focus:outline-none transition-all duration-200 text-lg shadow-inner border
                            ${isValid === false && !isValidating
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-[#2c3440] focus:border-[#00e054] focus:ring-1 focus:ring-[#00e054] hover:border-slate-600'
                        }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        {isValidating && <Loader2 size={18} className="text-[#40bcf4] animate-spin" />}
                        {!isValidating && isValid === true && username && <CheckCircle2 size={18} className="text-[#00e054]" />}
                        {!isValidating && isValid === false && username && <XCircle size={18} className="text-red-400" />}
                    </div>
                </div>
            </div>

            {/* Menu Déroulant Sur-Mesure */}
            <div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-2 transition-colors" style={{ color: isDropdownOpen ? '#40bcf4' : '' }}>
                    <ListFilter size={14} />
                    Ordre de la Watchlist
                </label>

                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full bg-[#14181c] text-white border rounded-xl py-3.5 pl-5 pr-5 flex items-center justify-between transition-all duration-200 text-base shadow-inner cursor-pointer
                            ${isDropdownOpen
                            ? 'border-[#40bcf4] ring-1 ring-[#40bcf4]'
                            : 'border-[#2c3440] hover:border-slate-600'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <SelectedIcon size={18} className={isDropdownOpen ? "text-[#40bcf4]" : "text-slate-400"} />
                            <span className="font-medium">{selectedOption.label}</span>
                        </div>
                        <ChevronDown
                            size={18}
                            className={`text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-[#40bcf4]' : ''}`}
                        />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-2 bg-[#1c232e] border border-[#2c3440] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-1.5 overflow-y-auto overflow-x-hidden max-h-56 animate-in fade-in slide-in-from-top-2 duration-200">
                            {SORT_OPTIONS.map((option) => {
                                const Icon = option.icon;
                                const isSelected = sort === option.id;

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => {
                                            setSort(option.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        // AJOUT DE cursor-pointer ICI
                                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#2c3440] transition-colors text-left cursor-pointer
                                            ${isSelected ? 'bg-[#2c3440]/50' : ''}
                                        `}
                                    >
                                        <Icon
                                            size={17}
                                            className={isSelected ? "text-[#40bcf4]" : "text-slate-500"}
                                        />
                                        <span className={`flex-1 text-sm ${isSelected ? 'text-white font-semibold' : 'text-slate-300 font-medium'}`}>
                                            {option.label}
                                        </span>
                                        {isSelected && <Check size={16} className="text-[#40bcf4]" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}