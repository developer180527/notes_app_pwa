import React from 'react';
import { ChevronLeft, ChevronRight, Library as LibraryIcon, Plus, Book, Search, Settings } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onNewBook: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleCollapse, onNewBook, searchQuery, setSearchQuery, onSettings }) => {
  return (
    <aside className={`hidden md:flex flex-col bg-[#1c1917] text-stone-400 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} h-screen sticky top-0 z-20 shadow-2xl`}>
      <div className="p-8 flex items-center justify-between text-white h-24">
        {!isCollapsed && (
           <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 bg-white text-[#1c1917] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                 <LibraryIcon size={18} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-serif font-bold tracking-tight">Folio</span>
           </div>
        )}
        <button 
          onClick={toggleCollapse} 
          className={`p-2 hover:bg-white/10 rounded-full transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 px-4 space-y-3 mt-2">
        <button 
          onClick={onNewBook} 
          className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 hover:text-white transition-all group border border-transparent ${!isCollapsed ? 'bg-white/10 text-white shadow-lg border-white/5' : 'justify-center'}`}
          title="New Book"
        >
           <Plus size={22} className={`${!isCollapsed ? "text-emerald-400" : "group-hover:text-emerald-400"} transition-colors`} />
           {!isCollapsed && <span className="font-medium tracking-wide">New Book</span>}
        </button>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6 opacity-50" />

        <button 
           onClick={() => setSearchQuery('')} 
           className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all ${searchQuery === '' ? 'text-white bg-white/5 shadow-inner' : ''} ${isCollapsed ? 'justify-center' : ''}`}
           title="Library"
        >
           <Book size={20} />
           {!isCollapsed && <span className="font-medium">Library</span>}
        </button>

        <div className="relative group w-full">
          <div 
             onClick={() => isCollapsed && toggleCollapse()}
             className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all cursor-pointer ${searchQuery !== '' ? 'text-white bg-white/5 shadow-inner' : ''} ${isCollapsed ? 'justify-center' : ''}`}
             title="Search"
          >
             <Search size={20} />
             {!isCollapsed && (
               <input 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search..." 
                 className="bg-transparent outline-none w-full text-stone-200 placeholder-stone-600 font-medium"
                 onClick={(e) => e.stopPropagation()}
               />
             )}
          </div>
        </div>

        <div className="mt-auto pt-4 absolute bottom-8 left-4 right-4">
          <button 
             onClick={onSettings} 
             className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all ${isCollapsed ? 'justify-center' : ''}`}
             title="Settings"
          >
             <Settings size={20} />
             {!isCollapsed && <span className="font-medium">Settings</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;