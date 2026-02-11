import React, { useState } from 'react';
import Library from './components/Library';
import Editor from './components/Editor';
import AudioPlayer from './components/AudioPlayer';
import { BookData } from './types';

const App: React.FC = () => {
  const [currentBook, setCurrentBook] = useState<BookData | null>(null);

  return (
    <div className="bg-stone-100 min-h-screen">
      {currentBook ? (
        <Editor 
          book={currentBook} 
          onClose={() => setCurrentBook(null)} 
        />
      ) : (
        <Library onOpenBook={setCurrentBook} />
      )}
      
      {/* Global Audio Player persists across views */}
      <AudioPlayer />
    </div>
  );
};

export default App;