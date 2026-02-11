import React from 'react';
import { X, Check } from 'lucide-react';
import { BookData } from '../../types';
import { COLORS } from '../../utils/helpers';

interface ColorModalProps {
  isOpen: boolean;
  book: BookData | null;
  onClose: () => void;
  onSave: (book: BookData, color: string) => void;
}

const ColorModal: React.FC<ColorModalProps> = ({ isOpen, book, onClose, onSave }) => {
  if (!isOpen || !book) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm" onClick={onClose}>
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 transform transition-all scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-serif font-bold text-stone-800">Cover Color</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => { onSave(book, color); onClose(); }}
              className={`w-14 h-14 rounded-full ${color} flex items-center justify-center shadow-sm hover:scale-110 transition-transform ring-2 ring-offset-2 ${book.coverColor === color ? 'ring-stone-800' : 'ring-transparent'}`}
            >
              {book.coverColor === color && <Check size={20} className="text-black/50" />}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full px-6 py-3.5 rounded-xl font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 transition-colors">Cancel</button>
      </div>
    </div>
  );
};

export default ColorModal;