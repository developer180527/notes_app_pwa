import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookData, PageData } from '../types';
import Page from './Page';
import { saveBook } from '../services/db';
import { generateId } from '../utils/helpers';
import { ChevronLeft, Save, Plus } from 'lucide-react';

interface EditorProps {
  book: BookData;
  onClose: () => void;
}

const Editor: React.FC<EditorProps> = ({ book: initialBook, onClose }) => {
  const [book, setBook] = useState<BookData>(initialBook);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Debounced Save
  useEffect(() => {
    const timer = setTimeout(() => {
      setSaving(true);
      saveBook({ ...book, updatedAt: Date.now() }).then(() => {
         setSaving(false);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [book]);

  const updatePage = (updatedPage: PageData) => {
    const newPages = book.pages.map(p => p.id === updatedPage.id ? updatedPage : p);
    setBook({ ...book, pages: newPages });
  };

  const addNewPage = () => {
    const newPage: PageData = {
      id: generateId(),
      blocks: [{ id: generateId(), type: 'text', content: '' }]
    };
    setBook(prev => ({ ...prev, pages: [...prev.pages, newPage] }));
    
    // Scroll to new page after render
    setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBook({ ...book, title: e.target.value });
  };

  // --- Touch & Scroll Logic for "Swipe Up to Add Page" ---
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
     touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY; // Positive if moved up (scrolled down)
    
    // Logic: If user swipes up heavily (> 80px)
    if (diff > 80) {
        const container = scrollContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Check if we are at the bottom (within 50px buffer)
            if (scrollHeight - scrollTop - clientHeight < 50) {
               // Haptic feedback for confirmation
               if (navigator.vibrate) navigator.vibrate(50);
               addNewPage();
            }
        }
    }
    touchStartY.current = null;
  };

  return (
    <div className="fixed inset-0 bg-[#e5e5e5] flex flex-col z-50 selection:bg-stone-200">
      {/* Top Bar - Glassmorphism */}
      <div className="h-20 absolute top-0 left-0 right-0 z-20 flex items-center px-6 justify-between transition-all duration-300 glass border-b border-black/5">
        <button 
          onClick={onClose} 
          className="p-3 hover:bg-black/5 rounded-full text-stone-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <input 
          value={book.title}
          onChange={handleTitleChange}
          className="flex-1 mx-6 text-center font-serif text-2xl font-bold bg-transparent outline-none text-stone-800 placeholder-stone-400 truncate"
          placeholder="Untitled Notebook"
        />

        <div className="w-10 flex items-center justify-center">
            {saving ? (
              <Save size={20} className="text-stone-400 animate-pulse" />
            ) : (
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all" />
            )}
        </div>
      </div>

      {/* Pages Container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden pt-28 px-4 md:px-0 scroll-smooth pb-12"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-[210mm] mx-auto flex flex-col gap-10 pb-32">
          {book.pages.map((page, index) => (
            <Page 
              key={page.id} 
              page={page} 
              pageIndex={index} 
              totalPageCount={book.pages.length}
              onUpdatePage={updatePage}
              onAddPage={addNewPage}
            />
          ))}
          
          <div ref={bottomRef} className="h-24 flex flex-col items-center justify-center opacity-40 gap-3 select-none pb-8">
             <div className="w-1 h-8 bg-stone-300 rounded-full mb-1 animate-pulse"></div>
             <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Swipe Up</span>
                <span className="text-[10px] text-stone-400">to add new page</span>
             </div>
          </div>

          <button 
             onClick={addNewPage}
             className="mx-auto bg-white hover:bg-stone-50 text-stone-800 px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-xl active:scale-95 border border-stone-100 flex items-center gap-2 group mb-8 md:mb-0"
          >
             <Plus size={18} />
             <span>Add New Page</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;