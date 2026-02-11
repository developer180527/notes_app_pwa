import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, MoreVertical, Play, Edit2, Palette, Trash2 } from 'lucide-react';
import { BookData } from '../../types';
import { formatDate } from '../../utils/helpers';

interface BookGridProps {
  books: BookData[];
  onOpen: (book: BookData) => void;
  onMenuAction: (action: 'listen' | 'rename' | 'color' | 'delete', book: BookData) => void;
  searchQuery: string;
}

const BookGrid: React.FC<BookGridProps> = ({ books, onOpen, onMenuAction, searchQuery }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-2 md:px-12 pb-32 md:pb-12 scroll-smooth">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
        {books.map((book, index) => {
          const isMultiPage = book.pages.length > 1;
          
          return (
            <div 
              key={book.id}
              onClick={() => onOpen(book)}
              className="group relative flex flex-col cursor-pointer perspective-1000 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Book/Page Cover */}
              <div 
                className={`aspect-[210/297] transition-all duration-500 ease-out transform group-hover:-translate-y-2 group-hover:-translate-x-1 relative overflow-hidden ${book.coverColor || 'bg-[#E8DCC4]'}
                  ${isMultiPage 
                    ? 'rounded-r-lg rounded-l-[2px] group-hover:rotate-y-[-5deg] shadow-[2px_5px_15px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] group-hover:shadow-[10px_15px_30px_rgba(0,0,0,0.15)]' 
                    : 'rounded-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] group-hover:shadow-[0_8px_16px_rgba(0,0,0,0.1)] border-t border-white/40' 
                  }
                `}
              >
                {/* Spine Effect (Only for Multi-page) */}
                {isMultiPage && (
                  <>
                    <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply opacity-50"></div>
                    <div className="absolute top-0 bottom-0 left-[1px] w-[1px] bg-white/30 z-20"></div>
                  </>
                )}

                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] opacity-20 mix-blend-multiply pointer-events-none"></div>

                <div className={`p-5 h-full flex flex-col relative z-0 ${isMultiPage ? 'pl-7' : 'pl-5'}`}>
                  <h3 className="text-xl font-serif font-bold text-stone-800/90 line-clamp-3 leading-tight break-words pr-4 drop-shadow-sm">
                    {book.title || 'Untitled'}
                  </h3>
                  <div className="mt-auto flex justify-between items-end opacity-60">
                     {isMultiPage ? (
                        <>
                            <BookOpen size={16} strokeWidth={2.5} />
                            <span className="text-xs font-bold tracking-wider">{book.pages.length} PAGES</span>
                        </>
                     ) : (
                        <FileText size={18} strokeWidth={2.5} />
                     )}
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
                    <button onClick={(e) => { e.stopPropagation(); onMenuAction('listen', book); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Play size={13} /> Listen</button>
                    <div className="h-px bg-stone-100 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); onMenuAction('rename', book); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Edit2 size={13} /> Rename</button>
                    <button onClick={(e) => { e.stopPropagation(); onMenuAction('color', book); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Palette size={13} /> Color</button>
                    <div className="h-px bg-stone-100 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); onMenuAction('delete', book); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 text-left transition-colors"><Trash2 size={13} /> Delete</button>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="mt-4 px-2">
                <p className="font-semibold text-stone-800 truncate text-base font-serif group-hover:text-stone-600 transition-colors">{book.title || 'Untitled'}</p>
                <p className="text-xs text-stone-400 font-medium tracking-wide mt-0.5 uppercase">{formatDate(book.updatedAt)}</p>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {books.length === 0 && (
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
  );
};

export default BookGrid;