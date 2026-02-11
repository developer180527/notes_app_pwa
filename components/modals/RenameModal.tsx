import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { BookData } from '../../types';

interface RenameModalProps {
  isOpen: boolean;
  book: BookData | null;
  onClose: () => void;
  onSave: (book: BookData, newTitle: string) => void;
}

const RenameModal: React.FC<RenameModalProps> = ({ isOpen, book, onClose, onSave }) => {
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (book) setNewTitle(book.title);
  }, [book]);

  if (!isOpen || !book) return null;

  const handleSave = () => {
    onSave(book, newTitle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif font-bold text-stone-800">Rename</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <input 
          autoFocus
          type="text" 
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full px-5 py-4 bg-stone-50 rounded-xl border-2 border-transparent focus:border-stone-900 outline-none text-stone-800 font-serif text-lg mb-8 transition-all placeholder-stone-300"
          placeholder="Enter book title..."
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 px-6 py-3.5 rounded-xl font-medium text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 px-6 py-3.5 rounded-xl font-medium text-white bg-stone-900 hover:bg-stone-800 transition-colors shadow-lg shadow-stone-900/20 active:scale-95 transform">Save</button>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;