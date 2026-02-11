import React, { useState } from 'react';
import { X, Moon, Cloud, User, LogOut, Loader, UploadCloud, DownloadCloud, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveState: {
    clientId: string;
    isAuthed: boolean;
    userProfile: { name?: string, picture?: string } | null;
    isSyncing: boolean;
    syncMessage: string;
    backupExists: boolean;
  };
  driveActions: {
    setClientId: (id: string) => void;
    saveClientId: () => void;
    signIn: () => void;
    signOut: () => void;
    backup: () => void;
    restore: () => void;
  };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, driveState, driveActions }) => {
  const [showClientIdInput, setShowClientIdInput] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = () => {
    if (!driveState.clientId) {
      setShowClientIdInput(true);
    } else {
      driveActions.signIn();
    }
  };

  const handleSaveId = () => {
    driveActions.saveClientId();
    setShowClientIdInput(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-stone-100 flex justify-between items-center shrink-0">
           <h2 className="text-xl font-serif font-bold text-stone-800">Settings</h2>
           <button onClick={onClose} className="p-2 bg-stone-50 rounded-full text-stone-400 hover:bg-stone-100 transition-colors">
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

              {!driveState.isAuthed ? (
                <div className="space-y-3">
                    {showClientIdInput ? (
                        <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                             <p className="text-xs text-stone-500">To enable Google Sign-In, enter your Client ID.</p>
                             <input 
                                className="w-full text-xs p-2 rounded-lg border border-stone-200 bg-white outline-none focus:border-blue-400"
                                value={driveState.clientId} 
                                onChange={(e) => driveActions.setClientId(e.target.value)} 
                                placeholder="apps.googleusercontent.com ID"
                             />
                             <div className="flex gap-2">
                                <button onClick={() => setShowClientIdInput(false)} className="flex-1 py-2 text-xs font-bold text-stone-500 hover:bg-stone-200 rounded-lg transition-colors">Cancel</button>
                                <button onClick={handleSaveId} className="flex-1 py-2 bg-stone-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Save</button>
                             </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-stone-500">Sign in to backup and restore your notebooks across devices.</p>
                            <button 
                                onClick={handleSignIn}
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
                             {driveState.userProfile?.picture ? (
                                <img src={driveState.userProfile.picture} alt="Profile" className="w-8 h-8 rounded-full" />
                             ) : (
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                     {driveState.userProfile?.name?.charAt(0) || <User size={14}/>}
                                </div>
                             )}
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-stone-700">{driveState.userProfile?.name || 'Google User'}</span>
                                <span className="text-[10px] text-stone-400">Connected</span>
                             </div>
                         </div>
                         <button onClick={driveActions.signOut} className="p-2 hover:bg-stone-50 rounded-full text-stone-400 hover:text-red-500 transition-colors">
                            <LogOut size={16} />
                         </button>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-2">
                         <button 
                            onClick={driveActions.backup} 
                            disabled={driveState.isSyncing}
                            className="flex flex-col items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95"
                         >
                            {driveState.isSyncing ? <Loader size={20} className="animate-spin text-blue-500" /> : <UploadCloud size={20} className="text-stone-600" />}
                            <span className="text-xs font-bold text-stone-600">Backup</span>
                         </button>
                         <button 
                            onClick={driveActions.restore}
                            disabled={driveState.isSyncing}
                            className={`flex flex-col items-center gap-2 p-3 bg-white border border-stone-200 rounded-xl transition-all active:scale-95 ${driveState.backupExists ? 'ring-2 ring-emerald-400 ring-offset-2 hover:bg-emerald-50' : 'hover:bg-emerald-50 hover:border-emerald-200'}`}
                         >
                            {driveState.isSyncing ? <Loader size={20} className="animate-spin text-emerald-500" /> : <DownloadCloud size={20} className={driveState.backupExists ? "text-emerald-500" : "text-stone-600"} />}
                            <span className="text-xs font-bold text-stone-600">Restore</span>
                         </button>
                    </div>
                </div>
              )}
              {driveState.syncMessage && (
                <p className="text-xs text-center font-medium text-stone-500 animate-pulse">{driveState.syncMessage}</p>
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
  );
};

export default SettingsModal;