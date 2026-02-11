import React, { useEffect, useState } from 'react';
import { BookData } from '../types';
import { getBooks, saveBook, deleteBook, importBooks } from '../services/db';
import { initGapiClient, initTokenClient, requestAccessToken, signOut, backupToDrive, restoreFromDrive, getUserProfile, checkForBackup } from '../services/drive';
import { audioService, extractTextFromBook } from '../services/audio';
import { generateId, COLORS } from '../utils/helpers';
import { Search, X } from 'lucide-react';

// Sub-components
import Sidebar from './library/Sidebar';
import BookGrid from './library/BookGrid';
import MobileNav from './library/MobileNav';
import RenameModal from './modals/RenameModal';
import ColorModal from './modals/ColorModal';
import SettingsModal from './modals/SettingsModal';
import CameraModal from './modals/CameraModal';

interface LibraryProps {
  onOpenBook: (book: BookData) => void;
}

// Global jsPDF declaration
declare global {
  interface Window {
    jspdf: any;
  }
}

const Library: React.FC<LibraryProps> = ({ onOpenBook }) => {
  const [books, setBooks] = useState<BookData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<BookData[]>([]);
  
  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Modals State
  const [modals, setModals] = useState({
    rename: { isOpen: false, book: null as BookData | null },
    color: { isOpen: false, book: null as BookData | null },
    settings: false,
    camera: false
  });

  // Drive Sync State
  const [driveState, setDriveState] = useState({
    clientId: localStorage.getItem('folio_drive_client_id') || '',
    isAuthed: false,
    userProfile: null as {name?: string, picture?: string} | null,
    isSyncing: false,
    syncMessage: '',
    backupExists: false
  });

  useEffect(() => {
    loadBooks();
    initGapiClient().catch(console.warn);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredBooks(books);
    } else {
      setFilteredBooks(books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [books, searchQuery]);

  // --- Data Logic ---

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

  const handleSaveRename = async (book: BookData, newTitle: string) => {
    await saveBook({ ...book, title: newTitle, updatedAt: Date.now() });
    loadBooks();
  };

  const handleSaveColor = async (book: BookData, color: string) => {
    await saveBook({ ...book, coverColor: color, updatedAt: Date.now() });
    loadBooks();
  };

  const handleBookDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      await deleteBook(id);
      loadBooks();
    }
  };

  const handleListen = (book: BookData) => {
    const text = extractTextFromBook(book);
    if (text) {
        audioService.play(text, book.title, 'Folio', book.coverColor);
    } else {
        alert("This notebook has no text content to read.");
    }
  };

  const handleSaveFromCamera = async (book: BookData) => {
      await saveBook(book);
      loadBooks();
      onOpenBook(book);
  };

  const handleMenuAction = (action: 'listen' | 'rename' | 'color' | 'delete', book: BookData) => {
    switch(action) {
      case 'listen': handleListen(book); break;
      case 'rename': setModals(m => ({ ...m, rename: { isOpen: true, book } })); break;
      case 'color': setModals(m => ({ ...m, color: { isOpen: true, book } })); break;
      case 'delete': handleBookDelete(book.id); break;
    }
  };

  // --- Drive Sync Logic ---

  const updateDriveState = (updates: Partial<typeof driveState>) => setDriveState(prev => ({ ...prev, ...updates }));

  const handleAuthSuccess = async () => {
    updateDriveState({ syncMessage: "Connecting to Drive..." });
    try {
        await initGapiClient();
        updateDriveState({ isAuthed: true, syncMessage: "Loading profile..." });
        
        const profile = await getUserProfile();
        updateDriveState({ userProfile: profile, syncMessage: "Checking for backups..." });

        const hasBackup = await checkForBackup();
        updateDriveState({ backupExists: hasBackup, syncMessage: hasBackup ? "Backup found!" : "Connected. No backups found." });
    } catch (e) {
        console.error("Auth success processing failed", e);
        updateDriveState({ syncMessage: "Connection failed." });
    }
  };

  const handleSignIn = async () => {
    if (!driveState.clientId) return;
    updateDriveState({ syncMessage: "Initializing login..." });
    try {
        await initTokenClient(driveState.clientId, (resp) => {
             if (resp && resp.access_token) {
                handleAuthSuccess();
            } else {
                updateDriveState({ syncMessage: "Sign in cancelled." });
                setTimeout(() => updateDriveState({ syncMessage: '' }), 2000);
            }
        });
        setTimeout(() => requestAccessToken(), 100);
    } catch (e) {
        console.error(e);
        updateDriveState({ syncMessage: "Configuration error." });
    }
  };

  const handleBackup = async () => {
    updateDriveState({ isSyncing: true, syncMessage: "Backing up..." });
    try {
        const allBooks = await getBooks();
        await backupToDrive(allBooks);
        updateDriveState({ backupExists: true, syncMessage: `Backup complete! (${allBooks.length} books)` });
        setTimeout(() => updateDriveState({ syncMessage: '' }), 3000);
    } catch (e: any) {
        updateDriveState({ syncMessage: "Backup failed: " + (e.message || "Unknown error") });
    } finally {
        updateDriveState({ isSyncing: false });
    }
  };

  const handleRestore = async () => {
    if (!confirm("This will merge books from Drive into your library. Continue?")) return;
    updateDriveState({ isSyncing: true, syncMessage: "Restoring..." });
    try {
        const booksFromDrive = await restoreFromDrive();
        await importBooks(booksFromDrive);
        await loadBooks();
        updateDriveState({ syncMessage: `Restored ${booksFromDrive.length} books!` });
        setTimeout(() => updateDriveState({ syncMessage: '' }), 3000);
    } catch (e: any) {
        updateDriveState({ syncMessage: "Restore failed: " + (e.message || "No backup found") });
    } finally {
        updateDriveState({ isSyncing: false });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f2f0e9] font-sans selection:bg-stone-200">
      
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onNewBook={createNewBook}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSettings={() => setModals(m => ({ ...m, settings: true }))}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
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

        <BookGrid 
          books={filteredBooks} 
          onOpen={onOpenBook}
          onMenuAction={handleMenuAction}
          searchQuery={searchQuery}
        />

        <MobileNav 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSettings={() => setModals(m => ({ ...m, settings: !m.settings }))}
          onNewBook={createNewBook}
          onScan={() => setModals(m => ({ ...m, camera: true }))}
          focusSearch={() => document.getElementById('mobile-search-input')?.focus()}
          isSettingsOpen={modals.settings}
        />
      </main>

      <RenameModal 
        isOpen={modals.rename.isOpen}
        book={modals.rename.book}
        onClose={() => setModals(m => ({ ...m, rename: { isOpen: false, book: null } }))}
        onSave={handleSaveRename}
      />

      <ColorModal 
        isOpen={modals.color.isOpen}
        book={modals.color.book}
        onClose={() => setModals(m => ({ ...m, color: { isOpen: false, book: null } }))}
        onSave={handleSaveColor}
      />

      <SettingsModal 
        isOpen={modals.settings}
        onClose={() => setModals(m => ({ ...m, settings: false }))}
        driveState={driveState}
        driveActions={{
          setClientId: (id) => {
             updateDriveState({ clientId: id });
             localStorage.setItem('folio_drive_client_id', id);
          },
          saveClientId: () => handleSignIn(),
          signIn: handleSignIn,
          signOut: () => {
             signOut();
             updateDriveState({ isAuthed: false, userProfile: null, backupExists: false, syncMessage: "Signed out." });
          },
          backup: handleBackup,
          restore: handleRestore
        }}
      />

      <CameraModal 
        isOpen={modals.camera}
        onClose={() => setModals(m => ({ ...m, camera: false }))}
        onSaveBook={handleSaveFromCamera}
      />

    </div>
  );
};

export default Library;