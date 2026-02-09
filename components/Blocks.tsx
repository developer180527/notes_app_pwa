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
      className="w-full bg-transparent resize-none outline-none text-stone-800 font-body text-xl leading-8 overflow-hidden placeholder-stone-300"
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
        <div className="relative rounded-sm overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
           <img src={block.content} alt="User upload" className="w-full h-auto max-h-[150mm] object-contain bg-stone-50" />
           <button 
             onClick={onDelete}
             className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
           >
             <X size={16} />
           </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border border-stone-200 bg-stone-50/50 rounded-lg flex flex-col items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-all"
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
    <div className="relative group my-8 overflow-x-auto">
      <div className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 text-stone-700 font-semibold font-sans">
            <tr>
              {data.headers.map((h, i) => (
                <th key={i} className="p-3 border-b border-r border-stone-200 min-w-[120px] last:border-r-0">
                  <input 
                    value={h} 
                    onChange={(e) => updateHeader(i, e.target.value)}
                    className="w-full bg-transparent outline-none font-bold"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-sans">
            {data.rows.map((row, rIdx) => (
              <tr key={row.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50 transition-colors">
                {row.cells.map((cell, cIdx) => (
                  <td key={cell.id} className="p-3 border-r border-stone-100 min-w-[120px] last:border-r-0">
                    <input 
                      value={cell.text} 
                      onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                      className="w-full bg-transparent outline-none text-stone-600"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex bg-stone-50 border-t border-stone-200">
           <button onClick={addRow} className="px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide hover:bg-stone-100 flex-1 transition-colors hover:text-stone-800">Add Row</button>
           <div className="w-px bg-stone-200"></div>
           <button onClick={addColumn} className="px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide hover:bg-stone-100 flex-1 transition-colors hover:text-stone-800">Add Column</button>
        </div>
      </div>
       <button 
             onClick={onDelete}
             className="absolute -top-3 -right-3 p-1.5 bg-white text-stone-400 border border-stone-200 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-sm"
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
          className="flex items-center gap-5 p-5 rounded-xl border border-stone-200 bg-stone-50/30 hover:bg-white hover:shadow-md transition-all group/file"
        >
          <div className="p-3.5 bg-stone-100 rounded-xl text-stone-600 group-hover/file:bg-stone-900 group-hover/file:text-white transition-colors">
            <FileText size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800 truncate font-sans">{block.meta?.name || 'Attached File'}</p>
            <p className="text-xs text-stone-400 mt-1">{block.meta?.size || ''}</p>
          </div>
          <div className="p-2 rounded-full hover:bg-stone-100 text-stone-400 transition-colors">
             <Download size={20} />
          </div>
        </a>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 border border-stone-200 bg-stone-50/50 rounded-xl flex items-center justify-center gap-3 text-stone-400 cursor-pointer hover:bg-stone-100 hover:border-stone-300 transition-all"
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