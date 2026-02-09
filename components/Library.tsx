import React, { useEffect, useState } from 'react';
import { BookData } from '../types';
import { getBooks, saveBook, deleteBook } from '../services/db';
import { generateId, formatDate } from '../utils/helpers';
import { 
  Plus, BookOpen, Trash2, Library as LibraryIcon, MoreVertical, 
  Edit2, Palette, Check, X, Search, Settings, ChevronLeft, ChevronRight, Menu, 
  Info, Monitor, Moon, Book
} from 'lucide-react';

interface LibraryProps {
  onOpenBook: (book: BookData) => void;
}

// Sophisticated pastel palette
const COLORS = [
  'bg-[#E8DCC4]', // Antique White
  'bg-[#DCC4B6]', // Dust Rose
  'bg-[#C4D0C4]', // Sage
  'bg-[#C4CCD4]', // Slate Blue
  'bg-[#DCC4D4]', // Lilac
  'bg-[#E4C4C4]', // Muted Red
  'bg-[#E4E4C4]', // Parchment
  'bg-[#D4D4D4]', // Silver
  'bg-[#B6C4CC]', // Cool Grey
  'bg-[#E0E0E0]', // Platinum
];

const Library: React.FC<LibraryProps> = ({ onOpenBook }) => {
  const [books, setBooks] = useState<BookData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<BookData[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Modal States
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; book: BookData | null; newTitle: string }>({ isOpen: false, book: null, newTitle: '' });
  const [colorModal, setColorModal] = useState<{ isOpen: boolean; book: BookData | null }>({ isOpen: false, book: null });
  const [settingsModal, setSettingsModal] = useState(false);

  useEffect(() => {
    loadBooks();
    
    // Close menu on click outside
    const handleClickOutside = () => setMenuOpenId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredBooks(books);
    } else {
      setFilteredBooks(books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [books, searchQuery]);

  const loadBooks = async () => {
    const loadedBooks = await getBooks();
    setBooks(loadedBooks.sort((a, b) => b.updatedAt - a.updatedAt));
  };

  const createNewBook = async () => {
    const newBook: BookData = {
      id: generateId(),
      title: 'Untitled Notebook',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pages: [
        { id: generateId(), blocks: [{ id: generateId(), type: 'text', content: '' }] }
      ],
      coverColor: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    await saveBook(newBook);
    loadBooks();
    onOpenBook(newBook);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      await deleteBook(id);
      loadBooks();
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const openRenameModal = (e: React.MouseEvent, book: BookData) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setRenameModal({ isOpen: true, book, newTitle: book.title });
  };

  const saveRename = async () => {
    if (renameModal.book) {
      const updatedBook = { ...renameModal.book, title: renameModal.newTitle, updatedAt: Date.now() };
      await saveBook(updatedBook);
      setRenameModal({ ...renameModal, isOpen: false, book: null });
      loadBooks();
    }
  };

  const openColorModal = (e: React.MouseEvent, book: BookData) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setColorModal({ isOpen: true, book });
  };

  const saveColor = async (color: string) => {
    if (colorModal.book) {
      const updatedBook = { ...colorModal.book, coverColor: color, updatedAt: Date.now() };
      await saveBook(updatedBook);
      setColorModal({ ...colorModal, isOpen: false, book: null });
      loadBooks();
    }
  };

  const focusSearch = () => {
    const input = document.getElementById('mobile-search-input') as HTMLInputElement;
    if (input) input.focus();
  };

  return (
    <div className="flex min-h-screen bg-[#f2f0e9] font-sans selection:bg-stone-200">
      
      {/* --- Desktop Sidebar --- */}
      <aside className={`hidden md:flex flex-col bg-[#1c1917] text-stone-400 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isSidebarCollapsed ? 'w-[80px]' : 'w-[280px]'} h-screen sticky top-0 z-20 shadow-2xl`}>
        <div className="p-8 flex items-center justify-between text-white h-24">
          {!isSidebarCollapsed && (
             <div className="flex items-center gap-3 animate-fade-in">
                <div className="w-8 h-8 bg-white text-[#1c1917] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                   <LibraryIcon size={18} strokeWidth={2.5} />
                </div>
                <span className="text-2xl font-serif font-bold tracking-tight">Folio</span>
             </div>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className={`p-2 hover:bg-white/10 rounded-full transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="flex-1 px-4 space-y-3 mt-2">
          <button 
            onClick={createNewBook} 
            className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 hover:text-white transition-all group border border-transparent ${!isSidebarCollapsed ? 'bg-white/10 text-white shadow-lg border-white/5' : 'justify-center'}`}
            title="New Book"
          >
             <Plus size={22} className={`${!isSidebarCollapsed ? "text-emerald-400" : "group-hover:text-emerald-400"} transition-colors`} />
             {!isSidebarCollapsed && <span className="font-medium tracking-wide">New Book</span>}
          </button>

          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6 opacity-50" />

          <button 
             onClick={() => {setSearchQuery(''); setSettingsModal(false)}} 
             className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all ${searchQuery === '' && !settingsModal ? 'text-white bg-white/5 shadow-inner' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}
             title="Library"
          >
             <Book size={20} />
             {!isSidebarCollapsed && <span className="font-medium">Library</span>}
          </button>

          <div className="relative group w-full">
            <div 
               onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
               className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all cursor-pointer ${searchQuery !== '' ? 'text-white bg-white/5 shadow-inner' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}
               title="Search"
            >
               <Search size={20} />
               {!isSidebarCollapsed && (
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
               onClick={() => setSettingsModal(true)} 
               className={`w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/5 hover:text-white transition-all ${settingsModal ? 'text-white bg-white/5' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`}
               title="Settings"
            >
               <Settings size={20} />
               {!isSidebarCollapsed && <span className="font-medium">Settings</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Mobile Header with Search */}
        <div className="md:hidden pt-8 px-6 pb-4 shrink-0 bg-[#f2f0e9] z-10 sticky top-0">
           <h1 className="text-4xl font-serif font-bold text-stone-900 mb-6">Library</h1>
           <div className="relative shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-2xl">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Search className="text-stone-400" size={18} />
             </div>
             <input 
               id="mobile-search-input"
               type="text"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="block w-full pl-11 pr-4 py-4 border-none rounded-2xl leading-5 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all font-medium"
               placeholder="Search books..."
             />
             {searchQuery && (
               <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-400">
                 <X size={16} />
               </button>
             )}
           </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex p-12 pb-8 justify-between items-end shrink-0">
           <div>
             <h1 className="text-4xl font-serif font-bold text-stone-800 tracking-tight">
               {searchQuery ? 'Search Results' : 'My Collection'}
             </h1>
             <p className="text-stone-500 mt-2 font-medium">
               {filteredBooks.length} {filteredBooks.length === 1 ? 'notebook' : 'notebooks'}
             </p>
           </div>
        </div>

        {/* Scrollable Book Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-2 md:px-12 pb-32 md:pb-12 scroll-smooth">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
            {filteredBooks.map((book, index) => (
              <div 
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="group relative flex flex-col cursor-pointer perspective-1000 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Book Cover */}
                <div 
                  className={`aspect-[210/297] rounded-r-lg rounded-l-[2px] transition-all duration-500 ease-out transform group-hover:-translate-y-2 group-hover:-translate-x-1 group-hover:rotate-y-[-5deg] ${book.coverColor || 'bg-[#E8DCC4]'} relative overflow-hidden shadow-[2px_5px_15px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] group-hover:shadow-[10px_15px_30px_rgba(0,0,0,0.15)]`}
                >
                  {/* Spine Effect */}
                  <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply opacity-50"></div>
                  <div className="absolute top-0 bottom-0 left-[1px] w-[1px] bg-white/30 z-20"></div>

                  {/* Texture Overlay (optional CSS pattern) */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-20 mix-blend-multiply pointer-events-none"></div>

                  <div className="p-5 pl-7 h-full flex flex-col relative z-0">
                    <h3 className="text-xl font-serif font-bold text-stone-800/90 line-clamp-3 leading-tight break-words pr-4 drop-shadow-sm">
                      {book.title || 'Untitled'}
                    </h3>
                    <div className="mt-auto flex justify-between items-end opacity-60">
                       <BookOpen size={16} strokeWidth={2.5} />
                       <span className="text-xs font-bold tracking-wider">{book.pages.length} PAGES</span>
                    </div>
                  </div>

                  {/* 3-Dot Options Button */}
                  <button 
                    onClick={(e) => toggleMenu(e, book.id)}
                    className="absolute top-3 right-2 p-1.5 hover:bg-black/5 rounded-full text-stone-600 transition-colors z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpenId === book.id && (
                    <div className="absolute top-10 right-2 w-36 bg-white/95 backdrop-blur-md rounded-xl shadow-xl ring-1 ring-black/5 z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <button onClick={(e) => openRenameModal(e, book)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Edit2 size={13} /> Rename</button>
                      <button onClick={(e) => openColorModal(e, book)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Palette size={13} /> Color</button>
                      <div className="h-px bg-stone-100 my-1"></div>
                      <button onClick={(e) => handleDelete(e, book.id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 text-left transition-colors"><Trash2 size={13} /> Delete</button>
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="mt-4 px-2">
                  <p className="font-semibold text-stone-800 truncate text-base font-serif group-hover:text-stone-600 transition-colors">{book.title || 'Untitled'}</p>
                  <p className="text-xs text-stone-400 font-medium tracking-wide mt-0.5 uppercase">{formatDate(book.updatedAt)}</p>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {filteredBooks.length === 0 && (
              <div className="col-span-full py-32 text-center">
                {searchQuery ? (
                   <p className="text-stone-400 font-serif text-lg italic">No books match your search.</p>
                ) : (
                   <div className="flex flex-col items-center gap-4 text-stone-300">
                      <BookOpen size={48} strokeWidth={1} />
                      <p className="text-xl font-serif text-stone-400">Your library is empty.</p>
                      <p className="text-sm">Create a new notebook to begin writing.</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Mobile Floating Nav --- */}
        <div className="md:hidden fixed bottom-8 left-0 right-0 z-40 flex items-end justify-center gap-4 pointer-events-none">
          
          {/* Nav Pill */}
          <div className="bg-[#1c1917]/90 backdrop-blur-xl text-stone-400 rounded-full h-16 px-8 flex items-center gap-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] pointer-events-auto ring-1 ring-white/10">
             <button 
                onClick={() => setSettingsModal(true)} 
                className="hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-90 duration-200"
             >
                <Settings size={22} />
             </button>
             
             <div className="w-px h-6 bg-white/10"></div>
             
             <button 
               onClick={() => { setSearchQuery(''); setSettingsModal(false); }} 
               className={`hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-90 duration-200 ${searchQuery === '' && !settingsModal ? 'text-white' : ''}`}
             >
                <LibraryIcon size={22} />
             </button>
             
             <div className="w-px h-6 bg-white/10"></div>

             <button 
               onClick={focusSearch} 
               className={`hover:text-white transition-colors flex flex-col items-center gap-1 active:scale-90 duration-200 ${searchQuery !== '' ? 'text-white' : ''}`}
             >
                <Search size={22} />
             </button>
          </div>

          {/* New Button */}
          <div className="flex flex-col items-center gap-2 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <button 
               onClick={createNewBook}
               className="w-14 h-14 bg-stone-100 text-stone-900 rounded-full flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] active:scale-90 transition-transform ring-1 ring-stone-200 hover:bg-white"
             >
               <Plus size={26} strokeWidth={2.5} />
             </button>
             <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm">New</span>
          </div>

        </div>

      </main>

      {/* --- Modals --- */}
      
      {/* Settings Modal */}
      {settingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={() => setSettingsModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
               <h2 className="text-xl font-serif font-bold text-stone-800">Settings</h2>
               <button onClick={() => setSettingsModal(false)} className="p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 transition-colors">
                 <X size={18} />
               </button>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 text-stone-700">
                     <Moon size={20} />
                     <span className="font-medium">Dark Mode</span>
                  </div>
                  <div className="w-11 h-6 bg-stone-300 rounded-full relative transition-colors">
                     <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform"></div>
                  </div>
               </div>
               <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 text-stone-700">
                     <Monitor size={20} />
                     <span className="font-medium">Display</span>
                  </div>
                  <ChevronRight size={18} className="text-stone-400" />
               </div>
               <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                  <div className="flex items-center gap-4 text-stone-700">
                     <Info size={20} />
                     <span className="font-medium">About Folio</span>
                  </div>
                  <span className="text-xs text-stone-400 font-mono bg-stone-200 px-2 py-1 rounded-md">v1.2.0</span>
               </div>
            </div>
            <div className="p-6 bg-stone-50 text-center text-xs text-stone-400 font-medium">
               <p>Designed for writers & thinkers.</p>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setRenameModal({ ...renameModal, isOpen: false })}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-stone-800">Rename</h3>
              <button onClick={() => setRenameModal({ ...renameModal, isOpen: false })} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <input 
              autoFocus
              type="text" 
              value={renameModal.newTitle}
              onChange={(e) => setRenameModal({ ...renameModal, newTitle: e.target.value })}
              className="w-full px-5 py-4 bg-stone-50 rounded-xl border-2 border-transparent focus:border-stone-900 outline-none text-stone-800 font-serif text-lg mb-8 transition-all placeholder-stone-300"
              placeholder="Enter book title..."
              onKeyDown={(e) => e.key === 'Enter' && saveRename()}
            />
            <div className="flex gap-4">
              <button onClick={() => setRenameModal({ ...renameModal, isOpen: false })} className="flex-1 px-6 py-3.5 rounded-xl font-medium text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
              <button onClick={saveRename} className="flex-1 px-6 py-3.5 rounded-xl font-medium text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20 active:scale-95 transform">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Color Modal */}
      {colorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setColorModal({ ...colorModal, isOpen: false })}>
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-stone-800">Cover Color</h3>
              <button onClick={() => setColorModal({ ...colorModal, isOpen: false })} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => saveColor(color)}
                  className={`w-14 h-14 rounded-full ${color} flex items-center justify-center shadow-sm hover:scale-110 transition-transform ring-2 ring-offset-2 ${colorModal.book?.coverColor === color ? 'ring-stone-800' : 'ring-transparent'}`}
                >
                  {colorModal.book?.coverColor === color && <Check size={20} className="text-black/50" />}
                </button>
              ))}
            </div>
            <button onClick={() => setColorModal({ ...colorModal, isOpen: false })} className="w-full px-6 py-3.5 rounded-xl font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Library;