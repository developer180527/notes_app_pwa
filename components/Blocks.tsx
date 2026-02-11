import React, { useState, useEffect, useRef } from 'react';
import { BlockData, TableContent, TableRow } from '../types';
import { generateId, fileToBase64 } from '../utils/helpers';
import { X, Image as ImageIcon, FileText, Download, Table as TableIcon } from 'lucide-react';

interface BlockProps {
  block: BlockData;
  onChange: (updatedBlock: BlockData) => void;
  onDelete: () => void;
  isFocus: boolean;
}

// --- Text Block ---
export const TextBlock: React.FC<BlockProps> = ({ block, onChange, isFocus }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [block.content]);

  useEffect(() => {
     if(isFocus && textareaRef.current) {
        textareaRef.current.focus();
     }
  }, [isFocus]);

  return (
    <textarea
      ref={textareaRef}
      value={block.content}
      onChange={(e) => onChange({ ...block, content: e.target.value })}
      placeholder="Start writing..."
      className="w-full bg-transparent resize-none outline-none text-stone-800 font-body text-xl leading-8 overflow-hidden placeholder-stone-300 transition-all focus:placeholder-stone-400/50"
      rows={1}
    />
  );
};

// --- Image Block ---
export const ImageBlock: React.FC<BlockProps> = ({ block, onChange, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        onChange({ ...block, content: base64, meta: { name: file.name } });
      } catch (err) {
        console.error("Failed to load image", err);
      }
    }
  };

  return (
    <div className="relative group my-8">
      {block.content ? (
        <div className="relative rounded-sm overflow-hidden shadow-sm transition-all hover:shadow-lg">
           <img src={block.content} alt="User upload" className="w-full h-auto max-h-[180mm] object-contain bg-stone-50/50" />
           <button 
             onClick={onDelete}
             className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md text-stone-600 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm"
           >
             <X size={16} />
           </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-stone-200 bg-stone-50/30 rounded-xl flex flex-col items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-stone-300 transition-all"
        >
          <div className="p-4 bg-white rounded-full shadow-sm mb-3">
             <ImageIcon size={24} className="text-stone-500" />
          </div>
          <span className="text-sm font-medium">Click to upload image</span>
        </div>
      )}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleUpload} 
      />
    </div>
  );
};

// --- Table Block ---
export const TableBlock: React.FC<BlockProps> = ({ block, onChange, onDelete }) => {
  const [data, setData] = useState<TableContent>(() => {
    try {
      return block.content ? JSON.parse(block.content) : { 
        headers: ['Column 1', 'Column 2'], 
        rows: [
          { id: generateId(), cells: [{ id: generateId(), text: '' }, { id: generateId(), text: '' }] },
          { id: generateId(), cells: [{ id: generateId(), text: '' }, { id: generateId(), text: '' }] }
        ] 
      };
    } catch {
       return { headers: ['Col 1'], rows: [] };
    }
  });

  const updateTable = (newData: TableContent) => {
    setData(newData);
    onChange({ ...block, content: JSON.stringify(newData) });
  };

  const addRow = () => {
    const newRow: TableRow = {
      id: generateId(),
      cells: data.headers.map(() => ({ id: generateId(), text: '' }))
    };
    updateTable({ ...data, rows: [...data.rows, newRow] });
  };

  const addColumn = () => {
    const newHeaders = [...data.headers, `Col ${data.headers.length + 1}`];
    const newRows = data.rows.map(row => ({
      ...row,
      cells: [...row.cells, { id: generateId(), text: '' }]
    }));
    updateTable({ headers: newHeaders, rows: newRows });
  };

  const updateCell = (rowIdx: number, cellIdx: number, val: string) => {
    const newRows = [...data.rows];
    newRows[rowIdx].cells[cellIdx].text = val;
    updateTable({ ...data, rows: newRows });
  };

  const updateHeader = (idx: number, val: string) => {
    const newHeaders = [...data.headers];
    newHeaders[idx] = val;
    updateTable({ ...data, headers: newHeaders });
  };

  return (
    <div className="relative group my-8 overflow-x-auto rounded-xl border border-stone-200 shadow-sm bg-white">
      <div className="overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-stone-50 text-stone-700 font-semibold font-sans">
            <tr>
              {data.headers.map((h, i) => (
                <th key={i} className="p-0 min-w-[120px] border-b border-stone-200">
                  <input 
                    value={h} 
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full h-full p-3 bg-transparent outline-none font-bold focus:bg-stone-100 transition-colors placeholder-stone-400"
                    placeholder="Header"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-sans">
            {data.rows.map((row, rIdx) => (
              <tr key={row.id} className="group/row">
                {row.cells.map((cell, cIdx) => (
                  <td key={cell.id} className="p-0 min-w-[120px] border-b border-stone-100 last:border-0">
                    <input 
                      value={cell.text} 
                      onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                      className="w-full h-full p-3 bg-transparent outline-none text-stone-600 focus:bg-blue-50/30 transition-colors"
                      placeholder="..."
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex bg-stone-50 border-t border-stone-200 divide-x divide-stone-200">
           <button onClick={addRow} className="px-4 py-2.5 text-xs font-bold text-stone-500 uppercase tracking-wide hover:bg-white flex-1 transition-colors hover:text-stone-800">
             + Row
           </button>
           <button onClick={addColumn} className="px-4 py-2.5 text-xs font-bold text-stone-500 uppercase tracking-wide hover:bg-white flex-1 transition-colors hover:text-stone-800">
             + Column
           </button>
      </div>

       <button 
             onClick={onDelete}
             className="absolute -top-2.5 -right-2.5 p-1.5 bg-white text-stone-400 border border-stone-200 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-md z-10"
           >
             <X size={14} />
       </button>
    </div>
  );
};

// --- File Block ---
export const FileBlock: React.FC<BlockProps> = ({ block, onChange, onDelete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        onChange({ ...block, content: base64, meta: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' } });
      } catch (err) {
        console.error("Failed to load file", err);
      }
    }
  };

  return (
    <div className="relative group my-8">
      {block.content ? (
        <a 
          href={block.content} 
          download={block.meta?.name || 'download'}
          className="flex items-center gap-5 p-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 hover:shadow-md transition-all group/file relative overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-800"></div>
          <div className="p-3 bg-stone-100 rounded-lg text-stone-600 group-hover/file:bg-stone-200 transition-colors">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-800 truncate font-sans text-sm">{block.meta?.name || 'Attached File'}</p>
            <p className="text-xs text-stone-500 mt-0.5">{block.meta?.size || ''}</p>
          </div>
          <div className="p-2 rounded-full hover:bg-stone-200 text-stone-400 transition-colors">
             <Download size={18} />
          </div>
        </a>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-6 border-2 border-dashed border-stone-200 bg-stone-50/30 rounded-xl flex items-center justify-center gap-3 text-stone-400 cursor-pointer hover:bg-stone-50 hover:border-stone-300 transition-all"
        >
          <FileText size={20} />
          <span className="text-sm font-medium">Attach a file</span>
        </div>
      )}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
      
      {block.content && (
        <button 
             onClick={(e) => { e.preventDefault(); onDelete(); }}
             className="absolute -top-2 -right-2 p-1.5 bg-white border border-stone-200 text-stone-400 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm"
           >
             <X size={14} />
        </button>
      )}
    </div>
  );
};