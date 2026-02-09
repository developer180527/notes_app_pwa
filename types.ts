export type BlockType = 'text' | 'image' | 'table' | 'file';

export interface BlockData {
  id: string;
  type: BlockType;
  content: string; // Text content, Base64 for images/files, or JSON string for table data
  meta?: any; // Extra metadata (filename, dimensions, etc.)
}

export interface PageData {
  id: string;
  blocks: BlockData[];
}

export interface BookData {
  id: string;
  title: string;
  pages: PageData[];
  createdAt: number;
  updatedAt: number;
  coverColor?: string;
}

export interface TableCell {
  id: string;
  text: string;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableContent {
  headers: string[];
  rows: TableRow[];
}
