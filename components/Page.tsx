import React, { useState } from 'react';
import { PageData, BlockData, BlockType } from '../types';
import { TextBlock, ImageBlock, TableBlock, FileBlock } from './Blocks';
import { Plus, Image as ImageIcon, Table as TableIcon, FileText, Type } from 'lucide-react';
import { generateId } from '../utils/helpers';

interface PageProps {
  page: PageData;
  pageIndex: number;
  totalPageCount: number;
  onUpdatePage: (updatedPage: PageData) => void;
  onAddPage: () => void;
}

const Page: React.FC<PageProps> = ({ page, pageIndex, totalPageCount, onUpdatePage, onAddPage }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleBlockChange = (updatedBlock: BlockData) => {
    const newBlocks = page.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b);
    onUpdatePage({ ...page, blocks: newBlocks });
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = page.blocks.filter(b => b.id !== blockId);
    onUpdatePage({ ...page, blocks: newBlocks });
  };

  const addBlock = (type: BlockType) => {
    const newBlock: BlockData = {
      id: generateId(),
      type,
      content: ''
    };
    onUpdatePage({ ...page, blocks: [...page.blocks, newBlock] });
    setShowMenu(false);
  };

  return (
    <div className="relative group/page mb-4 mx-auto w-full md:w-[210mm] transition-transform duration-300">
      
      {/* Page Content Container */}
      <div className="w-full min-h-[297mm] p-8 md:p-16 flex flex-col relative bg-paper shadow-page">
        
        {/* Render Blocks */}
        <div className="flex-1 space-y-4">
          {page.blocks.map((block) => (
            <React.Fragment key={block.id}>
              {block.type === 'text' && (
                <TextBlock block={block} onChange={handleBlockChange} onDelete={() => deleteBlock(block.id)} isFocus={false} />
              )}
              {block.type === 'image' && (
                <ImageBlock block={block} onChange={handleBlockChange} onDelete={() => deleteBlock(block.id)} isFocus={false} />
              )}
              {block.type === 'table' && (
                <TableBlock block={block} onChange={handleBlockChange} onDelete={() => deleteBlock(block.id)} isFocus={false} />
              )}
              {block.type === 'file' && (
                <FileBlock block={block} onChange={handleBlockChange} onDelete={() => deleteBlock(block.id)} isFocus={false} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Floating Action Menu for Blocks */}
        <div className="mt-12 flex justify-center pb-8">
           {!showMenu ? (
             <button 
               onClick={() => setShowMenu(true)}
               className="group flex items-center gap-2 px-4 py-2 rounded-full text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-all"
             >
               <Plus size={18} />
               <span className="text-sm font-medium">Add Content</span>
             </button>
           ) : (
             <div className="flex items-center gap-2 bg-stone-900 text-white p-1.5 rounded-full shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <button onClick={() => addBlock('text')} className="p-2.5 hover:bg-white/20 rounded-full transition-colors" title="Text">
                  <Type size={18} />
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button onClick={() => addBlock('image')} className="p-2.5 hover:bg-white/20 rounded-full transition-colors" title="Image">
                  <ImageIcon size={18} />
                </button>
                <button onClick={() => addBlock('table')} className="p-2.5 hover:bg-white/20 rounded-full transition-colors" title="Table">
                  <TableIcon size={18} />
                </button>
                <button onClick={() => addBlock('file')} className="p-2.5 hover:bg-white/20 rounded-full transition-colors" title="File">
                  <FileText size={18} />
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button onClick={() => setShowMenu(false)} className="p-2.5 hover:bg-red-500/80 rounded-full transition-colors" title="Close">
                  <Plus size={18} className="rotate-45" />
                </button>
             </div>
           )}
        </div>

        {/* Page Footer */}
        <div className="absolute bottom-6 left-0 w-full text-center pointer-events-none">
           <span className="text-stone-300 text-[10px] font-mono tracking-widest">{pageIndex + 1}</span>
        </div>
      </div>
    </div>
  );
};

export default Page;