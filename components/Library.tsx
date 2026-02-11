import React, { useEffect, useState, useRef } from 'react';
import { BookData, BlockData } from '../types';
import { getBooks, saveBook, deleteBook, importBooks } from '../services/db';
import { initGapiClient, initTokenClient, requestAccessToken, signOut, backupToDrive, restoreFromDrive, getUserProfile, checkForBackup } from '../services/drive';
import { audioService, extractTextFromBook } from '../services/audio';
import { generateId, formatDate } from '../utils/helpers';
import { 
  Plus, BookOpen, Trash2, Library as LibraryIcon, MoreVertical, 
  Edit2, Palette, Check, X, Search, Settings, ChevronLeft, ChevronRight, Menu, 
  Info, Monitor, Moon, Book, Camera, FileText, Repeat, Cloud, UploadCloud, DownloadCloud, LogOut, Loader, User, RefreshCw, StickyNote, Play
} from 'lucide-react';

interface LibraryProps {
  onOpenBook: (book: BookData) => void;
}

// Global jsPDF declaration
declare global {
  interface Window {
    jspdf: any;
  }
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
  
  // New Menu State (Mobile)
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  
  // Camera/Scan State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Modal States
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; book: BookData | null; newTitle: string }>({ isOpen: false, book: null, newTitle: '' });
  const [colorModal, setColorModal] = useState<{ isOpen: boolean; book: BookData | null }>({ isOpen: false, book: null });
  const [settingsModal, setSettingsModal] = useState(false);

  // Drive Sync State
  const [driveClientId, setDriveClientId] = useState(() => localStorage.getItem('folio_drive_client_id') || '');
  const [isDriveAuthed, setIsDriveAuthed] = useState(false);
  const [userProfile, setUserProfile] = useState<{name?: string, picture?: string} | null>(null);
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [backupExists, setBackupExists] = useState(false);

  useEffect(() => {
    loadBooks();
    
    // Close menu on click outside
    const handleClickOutside = () => {
        setMenuOpenId(null);
        setIsNewMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    
    // Attempt to silently load GAPI in background
    initGapiClient().catch(console.warn);

    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredBooks(books);
    } else {
      setFilteredBooks(books.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  }, [books, searchQuery]);

  // Success Handler after Token received
  const handleAuthSuccess = async () => {
    setSyncMessage("Connecting to Drive...");
    
    // 1. Ensure GAPI (Drive API) is fully loaded
    try {
        await initGapiClient();
    } catch (e) {
        console.error("GAPI load failed", e);
        setSyncMessage("Failed to load Google API.");
        return;
    }

    setIsDriveAuthed(true);
    
    // 2. Fetch Profile
    try {
        setSyncMessage("Loading profile...");
        const profile = await getUserProfile();
        setUserProfile(profile);
    } catch (e) {
        console.warn("Profile load failed", e);
    }

    // 3. Check for Backup
    try {
        setSyncMessage("Checking for backups...");
        const hasBackup = await checkForBackup();
        setBackupExists(hasBackup);
        
        if (hasBackup) {
            setSyncMessage("Backup found!");
        } else {
            setSyncMessage("Connected. No backups found.");
        }
    } catch (e) {
        console.error("Backup check failed", e);
        setSyncMessage("Connected (Backup check failed).");
    }
  };

  // Auth Button Click Handler
  const handleGoogleSignIn = async () => {
    if (!driveClientId || driveClientId.trim() === '') {
        setShowClientIdInput(true);
        return;
    }
    
    setSyncMessage("Initializing secure login...");
    try {
        // Initialize Token Client with the callback
        await initTokenClient(driveClientId, (resp) => {
             if (resp && resp.access_token) {
                handleAuthSuccess();
            } else {
                setSyncMessage("Sign in cancelled.");
                setTimeout(() => setSyncMessage(''), 2000);
            }
        });
        
        // Small delay to ensure UI updates before popup triggers
        setTimeout(() => requestAccessToken(), 100);
    } catch (e) {
        console.error("Auth init failed", e);
        setShowClientIdInput(true);
        setSyncMessage("Configuration error.");
    }
  };

  const handleSaveClientId = () => {
    if (!driveClientId) return;
    localStorage.setItem('folio_drive_client_id', driveClientId);
    setShowClientIdInput(false);
    // Proceed to sign in
    setTimeout(() => handleGoogleSignIn(), 500);
  };

  const handleSignOut = () => {
    signOut();
    setIsDriveAuthed(false);
    setUserProfile(null);
    setBackupExists(false);
    setSyncMessage("Signed out.");
  };

  const handleBackup = async () => {
    if (!isDriveAuthed) return;
    setIsSyncing(true);
    setSyncMessage("Backing up to app data...");
    try {
        const allBooks = await getBooks();
        await backupToDrive(allBooks);
        setSyncMessage(`Backup complete! (${allBooks.length} books)`);
        setBackupExists(true);
        setTimeout(() => setSyncMessage(''), 3000);
    } catch (e: any) {
        console.error(e);
        setSyncMessage("Backup failed: " + (e.message || "Unknown error"));
    } finally {
        setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!isDriveAuthed) return;
    if (!confirm("This will merge books from Drive into your library. Continue?")) return;
    
    setIsSyncing(true);
    setSyncMessage("Restoring...");
    try {
        const booksFromDrive = await restoreFromDrive();
        await importBooks(booksFromDrive);
        await loadBooks();
        setSyncMessage(`Restored ${booksFromDrive.length} books successfully!`);
        setTimeout(() => setSyncMessage(''), 3000);
    } catch (e: any) {
        console.error(e);
        setSyncMessage("Restore failed: " + (e.message || "No backup found"));
    } finally {
        setIsSyncing(false);
    }
  };

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

  // --- Audio Logic ---
  const handlePlayBook = (e: React.MouseEvent, book: BookData) => {
    e.stopPropagation();
    setMenuOpenId(null);
    const text = extractTextFromBook(book);
    if (text) {
        audioService.play(text, book.title, 'Folio', book.coverColor);
    } else {
        alert("This notebook has no text content to read.");
    }
  };

  // --- Camera & Scanning Logic ---
  const startCamera = async () => {
    setIsNewMenuOpen(false);
    setIsCameraOpen(true);
    setScannedImages([]);
    
    try {
      // Request high resolution (4K ideal) to ensure best quality for documents
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use actual video dimensions for high-res capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        // High quality JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setScannedImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const generatePDFAndSave = async () => {
    if (scannedImages.length === 0) return;
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;

        scannedImages.forEach((imgData, index) => {
            if (index > 0) pdf.addPage();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            const y = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;
            pdf.addImage(imgData, 'JPEG', 0, y, pdfWidth, pdfHeight);
        });

        const pdfBase64 = pdf.output('datauristring');
        const timestamp = new Date().toISOString().slice(0, 10);
        
        const newBook: BookData = {
          id: generateId(),
          title: `Scanned Doc ${timestamp}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pages: [
            { 
                id: generateId(), 
                blocks: [
                    { 
                        id: generateId(), 
                        type: 'file', 
                        content: pdfBase64,
                        meta: { name: `Scan-${timestamp}.pdf`, size: 'PDF' }
                    },
                    ...scannedImages.map(img => ({
                        id: generateId(),
                        type: 'image' as const,
                        content: img
                    }))
                ] 
            }
          ],
          coverColor: COLORS[0]
        };

        await saveBook(newBook);
        stopCamera();
        loadBooks();
        onOpenBook(newBook);

    } catch (e) {
        console.error("PDF Generation failed", e);
        alert("Failed to generate PDF.");
    }
  };

  // --- End Camera Logic ---

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
            {filteredBooks.map((book, index) => {
              const isMultiPage = book.pages.length > 1;
              
              return (
                <div 
                  key={book.id}
                  onClick={() => onOpenBook(book)}
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

                    {/* Texture Overlay (optional CSS pattern) */}
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
                        <button onClick={(e) => handlePlayBook(e, book)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 text-left transition-colors"><Play size={13} /> Listen</button>
                        <div className="h-px bg-stone-100 my-1"></div>
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
              );
            })}

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

        {/* --- Mobile Floating Navigation --- */}
        <div className="md:hidden fixed bottom-6 left-5 right-5 z-50 flex items-end gap-4 pointer-events-none">
            
            {/* Nav Pill */}
            <div className="flex-1 h-16 bg-[#fdfbf7]/90 backdrop-blur-xl border border-stone-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full flex items-center justify-between px-6 pointer-events-auto">
                 <button 
                    onClick={() => { setSearchQuery(''); setSettingsModal(false); }}
                    className={`flex flex-col items-center justify-center h-full w-12 transition-colors active:scale-95 ${searchQuery === '' && !settingsModal ? 'text-stone-900' : 'text-stone-400'}`}
                 >
                     <LibraryIcon size={24} strokeWidth={searchQuery === '' && !settingsModal ? 2.5 : 2} />
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
                    onClick={() => setSettingsModal(true)}
                    className={`flex flex-col items-center justify-center h-full w-12 transition-colors active:scale-95 ${settingsModal ? 'text-stone-900' : 'text-stone-400'}`}
                 >
                     <Settings size={24} strokeWidth={settingsModal ? 2.5 : 2} />
                 </button>
            </div>

            {/* New Button (FAB) */}
            <div className="relative pointer-events-auto shrink-0">
                 {/* Menu items pop up here */}
                 {isNewMenuOpen && (
                    <div className="absolute bottom-full mb-4 right-0 flex flex-col items-end gap-3 w-48 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <button 
                            onClick={startCamera}
                            className="flex items-center gap-3 bg-white text-stone-800 pl-4 pr-1.5 py-1.5 rounded-full shadow-lg border border-stone-100 hover:bg-stone-50"
                        >
                            <span className="text-xs font-bold tracking-wide">SCAN</span>
                            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                                <Camera size={16} />
                            </div>
                        </button>
                        <button 
                            onClick={createNewBook}
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

      </main>

      {/* --- Modals --- */}
      
      {/* Settings Modal */}
      {settingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={() => setSettingsModal(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-100 flex justify-between items-center shrink-0">
               <h2 className="text-xl font-serif font-bold text-stone-800">Settings</h2>
               <button onClick={() => setSettingsModal(false)} className="p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 transition-colors">
                 <X size={18} />
               </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
               
               {/* Appearance */}
               <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4 text-stone-700">
                     <Moon size={20} />
                     <span className="font-medium">Dark Mode</span>
                  </div>
                  <div className="w-11 h-6 bg-stone-300 rounded-full relative transition-colors">
                     <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform"></div>
                  </div>
               </div>

               {/* Drive Sync Section */}
               <div className="bg-stone-50 rounded-2xl p-4 space-y-4 border border-stone-100">
                  <div className="flex items-center gap-4 text-stone-800">
                     <Cloud size={20} className="text-blue-500" />
                     <span className="font-medium">Cloud Sync</span>
                  </div>

                  {!isDriveAuthed ? (
                    <div className="space-y-3">
                        {showClientIdInput ? (
                            <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                                 <p className="text-xs text-stone-500">To enable Google Sign-In, enter your Client ID.</p>
                                 <input 
                                    className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white outline-none focus:border-blue-400"
                                    value={driveClientId} 
                                    onChange={(e) => setDriveClientId(e.target.value)} 
                                    placeholder="apps.googleusercontent.com ID"
                                 />
                                 <div className="flex gap-2">
                                    <button onClick={() => setShowClientIdInput(false)} className="flex-1 py-2 text-xs font-bold text-stone-500 hover:bg-stone-200 rounded-lg transition-colors">Cancel</button>
                                    <button onClick={handleSaveClientId} className="flex-1 py-2 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Save</button>
                                 </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs text-stone-500">Sign in to backup and restore your notebooks across devices.</p>
                                <button 
                                    onClick={handleGoogleSignIn}
                                    className="w-full bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:border-stone-300 font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95"
                                >
                                     <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                        </g>
                                     </svg>
                                     Sign in with Google
                                </button>
                                <button onClick={() => setShowClientIdInput(true)} className="text-[10px] text-stone-400 hover:text-stone-600 underline">
                                    Configure Client ID
                                </button>
                            </div>
                        )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in">
                         <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                             <div className="flex items-center gap-3">
                                 {userProfile?.picture ? (
                                    <img src={userProfile.picture} alt="Profile" className="w-8 h-8 rounded-full" />
                                 ) : (
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                         {userProfile?.name?.charAt(0) || <User size={14}/>}
                                    </div>
                                 )}
                                 <div className="flex flex-col">
                                    <span className="text-xs font-bold text-stone-700">{userProfile?.name || 'Google User'}</span>
                                    <span className="text-[10px] text-stone-400">Connected</span>
                                 </div>
                             </div>
                             <button onClick={handleSignOut} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 hover:text-red-500 transition-colors">
                                <LogOut size={16} />
                             </button>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={handleBackup} 
                                disabled={isSyncing}
                                className="flex flex-col items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95"
                             >
                                {isSyncing ? <Loader size={20} className="animate-spin text-blue-500" /> : <UploadCloud size={20} className="text-stone-600" />}
                                <span className="text-xs font-bold text-stone-600">Backup</span>
                             </button>
                             <button 
                                onClick={handleRestore}
                                disabled={isSyncing}
                                className={`flex flex-col items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl transition-all active:scale-95 ${backupExists ? 'ring-2 ring-emerald-400 ring-offset-2 hover:bg-emerald-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}
                             >
                                {isSyncing ? <Loader size={20} className="animate-spin text-emerald-500" /> : <DownloadCloud size={20} className={backupExists ? "text-emerald-500" : "text-stone-600"} />}
                                <span className="text-xs font-bold text-stone-600">Restore</span>
                             </button>
                        </div>
                    </div>
                  )}
                  {syncMessage && (
                    <p className="text-xs text-center font-medium text-stone-500 animate-pulse">{syncMessage}</p>
                  )}
               </div>

               <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
                  <div className="flex items-center gap-4 text-stone-700">
                     <Info size={20} />
                     <span className="font-medium">About Folio</span>
                  </div>
                  <span className="text-xs text-stone-400 font-mono bg-stone-200 px-2 py-1 rounded-md">v1.4.0</span>
               </div>
            </div>
            
            <div className="p-6 bg-stone-50 text-center text-xs text-stone-400 font-medium shrink-0">
               <p>Designed for writers & thinkers.</p>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setRenameModal({ ...renameModal, isOpen: false })}>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={() => setColorModal({ ...colorModal, isOpen: false })}>
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

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
            <div className="relative flex-1 bg-black overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                
                {/* Captured Thumbnails */}
                {scannedImages.length > 0 && (
                    <div className="absolute top-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {scannedImages.map((img, idx) => (
                            <div key={idx} className="w-16 h-20 bg-stone-800 rounded-lg border border-white/20 shrink-0 overflow-hidden relative">
                                <img src={img} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1">{idx+1}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="h-32 bg-stone-900 flex items-center justify-between px-8">
                <button onClick={stopCamera} className="text-white p-4 rounded-full hover:bg-white/10">
                    <X size={24} />
                </button>
                
                <button onClick={captureImage} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform">
                    <div className="w-14 h-14 bg-white rounded-full"></div>
                </button>
                
                <button onClick={generatePDFAndSave} className={`text-white p-4 rounded-full hover:bg-white/10 ${scannedImages.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Check size={24} />
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default Library;