import React, { useState, useEffect } from 'react';
import { Library as LibraryIcon, Search, Settings, Camera, Edit2, Plus } from 'lucide-react';

interface MobileNavProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSettings: () => void;
  onNewBook: () => void;
  onScan: () => void;
  focusSearch: () => void;
  isSettingsOpen: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  onSettings, 
  onNewBook, 
  onScan, 
  focusSearch, 
  isSettingsOpen 
}) => {
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setIsNewMenuOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="md:hidden fixed bottom-6 left-5 right-5 z-50 flex items-end gap-4 pointer-events-none">
        
        {/* Nav Pill */}
        <div className="flex-1 h-16 bg-[#fdfbf7]/90 backdrop-blur-xl border border-stone-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full flex items-center justify-between px-6 pointer-events-auto">
             <button 
                onClick={() => { setSearchQuery(''); if(isSettingsOpen) onSettings(); }}
                className={`flex flex-col items-center justify-center h-full w-12 transition-colors active:scale-95 ${searchQuery === '' && !isSettingsOpen ? 'text-stone-900' : 'text-stone-400'}`}
             >
                 <LibraryIcon size={24} strokeWidth={searchQuery === '' && !isSettingsOpen ? 2.5 : 2} />
             </button>

             <div className="w-px h-6 bg-stone-200"></div>

             <button 
                onClick={focusSearch}
                className={`flex flex-col items-center justify-center h-full w-12 transition-colors active:scale-95 ${searchQuery !== '' ? 'text-stone-900' : 'text-stone-400'}`}
             >
                 <Search size={24} strokeWidth={searchQuery !== '' ? 2.5 : 2} />
             </button>

             <div className="w-px h-6 bg-stone-200"></div>

             <button 
                onClick={onSettings}
                className={`flex flex-col items-center justify-center h-full w-12 transition-colors active:scale-95 ${isSettingsOpen ? 'text-stone-900' : 'text-stone-400'}`}
             >
                 <Settings size={24} strokeWidth={isSettingsOpen ? 2.5 : 2} />
             </button>
        </div>

        {/* New Button (FAB) */}
        <div className="relative pointer-events-auto shrink-0">
             {/* Menu items pop up here */}
             {isNewMenuOpen && (
                <div className="absolute bottom-full mb-4 right-0 flex flex-col items-end gap-3 w-48 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onScan(); }}
                        className="flex items-center gap-3 bg-white text-stone-800 pl-4 pr-1.5 py-1.5 rounded-full shadow-lg border border-stone-100 hover:bg-stone-50"
                    >
                        <span className="text-xs font-bold tracking-wide">SCAN</span>
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                            <Camera size={16} />
                        </div>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onNewBook(); }}
                        className="flex items-center gap-3 bg-white text-stone-800 pl-4 pr-1.5 py-1.5 rounded-full shadow-lg border border-stone-100 hover:bg-stone-50"
                    >
                         <span className="text-xs font-bold tracking-wide">NOTE</span>
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                            <Edit2 size={16} />
                        </div>
                    </button>
                </div>
             )}

             <button 
               onClick={(e) => { e.stopPropagation(); setIsNewMenuOpen(!isNewMenuOpen); }}
               className={`w-16 h-16 bg-[#1c1917] text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 ring-4 ring-[#f2f0e9] active:scale-95 ${isNewMenuOpen ? 'rotate-45' : ''}`}
             >
               <Plus size={32} strokeWidth={2} />
             </button>
        </div>
    </div>
  );
};

export default MobileNav;