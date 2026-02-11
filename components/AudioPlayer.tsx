import React, { useState, useEffect } from 'react';
import { audioService } from '../services/audio';
import { Play, Pause, SkipForward, SkipBack, Volume2, X, ChevronDown, MoreHorizontal } from 'lucide-react';

const AudioPlayer: React.FC = () => {
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    title: '',
    author: '',
    coverColor: 'bg-stone-200',
    volume: 1.0,
    hasContent: false,
    progress: 0,
    currentSegment: 0,
    totalSegments: 0
  });
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  useEffect(() => {
    return audioService.subscribe((state) => {
      // Don't overwrite slider if user is currently dragging it
      if (!isDragging) {
         setPlayerState(state);
      } else {
         // Update background state but keep slider visual constant
         setPlayerState(prev => ({...state, progress: prev.progress}));
      }
    });
  }, [isDragging]);

  const handleSeekStart = () => {
      setIsDragging(true);
      setDragValue(playerState.progress);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDragValue(parseFloat(e.target.value));
      setPlayerState(prev => ({ ...prev, progress: parseFloat(e.target.value) }));
  };

  const handleSeekEnd = (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(false);
      // Commit seek
      audioService.seek(dragValue);
  };

  if (!playerState.hasContent) return null;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playerState.isPlaying) {
      audioService.pause();
    } else {
      audioService.resume();
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.nextChunk();
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioService.prevChunk();
  };

  return (
    <>
      {/* Mini Player */}
      <div 
        onClick={() => setIsFullPlayerOpen(true)}
        className="fixed bottom-28 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 h-16 bg-[#f9f9f9]/90 backdrop-blur-xl border border-stone-200/50 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-40 flex items-center px-2 cursor-pointer transition-all hover:bg-white/95"
      >
        <div className={`w-12 h-12 rounded-lg shadow-sm shrink-0 flex items-center justify-center ${playerState.coverColor}`}>
           <span className="text-[10px] font-serif font-bold opacity-50">FOLIO</span>
        </div>
        
        <div className="flex-1 min-w-0 mx-3 flex items-center">
            <span className="font-sans font-medium text-stone-900 truncate text-sm">{playerState.title || 'Untitled'}</span>
        </div>

        <div className="flex items-center gap-1 pr-1">
            <button 
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center text-stone-900 hover:scale-105 active:scale-95 transition-transform"
            >
                {playerState.isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button 
                onClick={handleNext}
                className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-900 transition-colors active:scale-95"
            >
                <SkipForward size={24} fill="currentColor" />
            </button>
        </div>
      </div>

      {/* Full Player Modal */}
      {isFullPlayerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[#f2f2f2] md:bg-black/50 md:backdrop-blur-sm md:items-center md:justify-center animate-in slide-in-from-bottom-full duration-300">
            
            {/* Mobile Full Screen / Desktop Modal */}
            <div className="w-full h-full md:w-[400px] md:h-[750px] bg-[#fdfbf9] md:rounded-[40px] flex flex-col relative md:shadow-2xl overflow-hidden">
                
                {/* Drag Indicator (Mobile) */}
                <div className="md:hidden w-full h-6 flex justify-center items-center pt-2" onClick={() => setIsFullPlayerOpen(false)}>
                    <div className="w-10 h-1 bg-stone-300 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="px-8 pt-4 pb-2 flex justify-between items-center shrink-0">
                    <button onClick={() => setIsFullPlayerOpen(false)} className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-800 transition-colors">
                        <ChevronDown size={28} />
                    </button>
                    <span className="text-xs font-bold tracking-widest text-stone-400 uppercase">Playing from Library</span>
                    <button className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-800 transition-colors">
                        <MoreHorizontal size={24} />
                    </button>
                </div>

                {/* Cover Art Area */}
                <div className="flex-1 flex items-center justify-center p-8 md:p-10 min-h-0">
                    <div className={`w-full aspect-square rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] ${playerState.coverColor} flex flex-col p-8 relative overflow-hidden ring-1 ring-black/5`}>
                        {/* Book Spine Effect */}
                        <div className="absolute top-0 bottom-0 left-0 w-4 bg-black/10 mix-blend-multiply blur-[1px]"></div>
                        
                        <div className="flex-1 flex flex-col justify-center text-center">
                            <h2 className="font-serif text-3xl md:text-4xl font-bold text-stone-800 leading-tight mb-2 drop-shadow-sm line-clamp-4">
                                {playerState.title || 'Untitled'}
                            </h2>
                            <p className="font-sans text-sm font-medium text-stone-600 uppercase tracking-widest opacity-70">
                                {playerState.author}
                            </p>
                        </div>
                        
                        <div className="absolute bottom-4 right-4 opacity-30">
                            <Volume2 size={24} />
                        </div>
                    </div>
                </div>

                {/* Controls Area */}
                <div className="px-8 pb-12 space-y-8">
                    
                    {/* Title/Author Info (Below Art) */}
                    <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                             <h3 className="font-bold text-stone-900 text-xl truncate">{playerState.title || 'Untitled'}</h3>
                             <p className="text-stone-500 font-medium truncate">{playerState.author}</p>
                        </div>
                        <button className="p-2 bg-stone-100 rounded-full text-stone-500">
                             <MoreHorizontal size={20} />
                        </button>
                    </div>

                    {/* Progress Slider */}
                    <div className="w-full space-y-2 group">
                        <input 
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playerState.progress}
                            onMouseDown={handleSeekStart}
                            onTouchStart={handleSeekStart}
                            onChange={handleSeekChange}
                            onMouseUp={handleSeekEnd}
                            onTouchEnd={handleSeekEnd}
                            className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-stone-800 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-stone-400 group-hover:text-stone-500 transition-colors">
                            <span>{playerState.currentSegment}</span>
                            <span>{playerState.totalSegments}</span>
                        </div>
                    </div>

                    {/* Main Transport Controls */}
                    <div className="flex justify-between items-center px-2">
                        <button 
                            onClick={handlePrev}
                            className="text-stone-800 hover:text-stone-600 active:scale-90 transition-all"
                        >
                            <SkipBack size={36} fill="currentColor" />
                        </button>
                        
                        <button 
                            onClick={togglePlay}
                            className="w-20 h-20 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                             {playerState.isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>
                        
                        <button 
                            onClick={handleNext}
                            className="text-stone-800 hover:text-stone-600 active:scale-90 transition-all"
                        >
                            <SkipForward size={36} fill="currentColor" />
                        </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-4 pt-2">
                        <Volume2 size={16} className="text-stone-400" />
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01"
                            value={playerState.volume}
                            onChange={(e) => audioService.setVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:rounded-full"
                        />
                        <Volume2 size={20} className="text-stone-400" />
                    </div>

                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default AudioPlayer;