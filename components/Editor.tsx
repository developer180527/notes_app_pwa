import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BookData, PageData } from '../types';
import Page from './Page';
import { saveBook } from '../services/db';
import { audioService } from '../services/audio';
import { generateId } from '../utils/helpers';
import { ChevronLeft, Save, Plus, ArrowUp, Play } from 'lucide-react';

interface EditorProps {
  book: BookData;
  onClose: () => void;
}

const Editor: React.FC<EditorProps> = ({ book: initialBook, onClose }) => {
  const [book, setBook] = useState<BookData>(initialBook);
  const [saving, setSaving] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showPlaySelection, setShowPlaySelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  
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

  // Selection Detection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      // Use a timeout to allow for transient states (like button clicks) to process before clearing
      if (selection && selection.toString().trim().length > 0) {
         setSelectedText(selection.toString());
         setShowPlaySelection(true);
      } else {
         // Don't hide immediately to prevent flickering or accidental loss during interaction
         // We rely on the button's event handlers to fire before this effect clears the UI if the selection is lost due to the click.
         setShowPlaySelection(false);
      }
    };
    
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handlePlaySelection = (e: React.SyntheticEvent) => {
     // Prevent default to stop any native behavior (like navigation or focus shift)
     e.preventDefault();
     e.stopPropagation();

     if (selectedText) {
        audioService.play(selectedText, book.title, 'Folio', book.coverColor);
        
        // Deselect text after a short delay
        setTimeout(() => {
            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
            setShowPlaySelection(false);
        }, 100);
     }
  };

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
    
    // Scroll to new page after render with a slight delay to ensure DOM update
    setTimeout(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 100);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBook({ ...book, title: e.target.value });
  };

  // --- Touch & Scroll Logic for "Swipe Up to Add Page" ---
  const handleTouchStart = (e: React.TouchEvent) => {
     touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchStartY.current - touchY; // Positive if moved up (scrolled down)
    
    const container = scrollContainerRef.current;
    if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        // Check if we are at the bottom (within small buffer)
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
        
        if (isAtBottom && diff > 0) {
            setPullDistance(diff);
        } else {
            setPullDistance(0);
        }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    
    // Threshold to trigger action
    if (pullDistance > 60) {
        if (navigator.vibrate) navigator.vibrate(50);
        addNewPage();
    }
    
    setPullDistance(0);
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
        onTouchMove={handleTouchMove}
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
          
          <button 
             onClick={addNewPage}
             className="mx-auto bg-white hover:bg-stone-50 text-stone-800 px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-xl active:scale-95 border border-stone-100 flex items-center gap-2 group mb-8 md:mb-0"
          >
             <Plus size={18} />
             <span>Add New Page</span>
          </button>
          
          {/* Bottom Spacer for Auto-scroll */}
          <div ref={bottomRef} className="h-12 w-full" />
        </div>
      </div>

      {/* Play Selection Button - Fixed at bottom center, appearing only when text selected */}
      {showPlaySelection && (
         <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
            <button 
                onMouseDown={(e) => e.preventDefault()} // Desktop: Prevent focus loss
                onTouchStart={(e) => {
                  e.preventDefault(); // Mobile: Prevent selection clear & mouse emulation
                  handlePlaySelection(e); // Trigger action directly
                }}
                onClick={handlePlaySelection} // Desktop: Trigger action
                className="pointer-events-auto flex items-center gap-2 bg-stone-900 text-white px-6 py-3 rounded-full shadow-2xl hover:bg-black transition-all active:scale-95 ring-1 ring-white/20"
            >
                <Play size={18} fill="currentColor" />
                <span className="font-medium text-sm">Read Selection</span>
            </button>
         </div>
      )}

    </div>
  );
};

export default Editor;