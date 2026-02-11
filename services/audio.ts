import { BookData } from '../types';

// Silent WAV (universally supported) - keeps mobile browsers awake
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

type AudioState = {
  isPlaying: boolean;
  title: string;
  author: string;
  coverColor: string;
  volume: number;
  hasContent: boolean;
  progress: number; // 0 to 100
  currentSegment: number;
  totalSegments: number;
};

type Listener = (state: AudioState) => void;

class AudioService {
  private synth: SpeechSynthesis;
  private audio: HTMLAudioElement;
  private isPlaying: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private currentTextIndex: number = 0;
  private playPromise: Promise<void> | undefined;
  
  // Precise Tracking
  private resumeCharIndex: number = 0; 
  private queueLengths: number[] = [];
  private totalLength: number = 0;

  // State for UI
  private listeners: Set<Listener> = new Set();
  private state: AudioState = {
    isPlaying: false,
    title: '',
    author: '',
    coverColor: 'bg-stone-200',
    volume: 1.0,
    hasContent: false,
    progress: 0,
    currentSegment: 0,
    totalSegments: 0
  };

  constructor() {
    this.synth = window.speechSynthesis;
    this.audio = new Audio(SILENT_AUDIO);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    
    // Handle interruptions
    window.addEventListener('beforeunload', () => this.stop());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Initial state
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  private updateProgressState() {
    let currentPos = 0;
    // Sum lengths of previous chunks
    for (let i = 0; i < this.currentTextIndex; i++) {
        currentPos += this.queueLengths[i] || 0;
    }
    // Add current chunk offset
    currentPos += this.resumeCharIndex;

    const pct = this.totalLength > 0 ? (currentPos / this.totalLength) * 100 : 0;

    this.state = {
        ...this.state,
        isPlaying: this.isPlaying,
        currentSegment: this.currentTextIndex + 1,
        totalSegments: this.queue.length,
        progress: pct
    };
    this.notify();
  }

  public setVolume(val: number) {
    this.state.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.state.volume;
    if (this.currentUtterance) {
        this.currentUtterance.volume = this.state.volume;
    }
    this.notify();
  }

  // Generate a dynamic cover image from color for the lock screen
  private generateCoverImage(title: string, colorClass: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Extract hex color from tailwind class roughly or default
    const colorMap: Record<string, string> = {
      'bg-[#E8DCC4]': '#E8DCC4',
      'bg-[#DCC4B6]': '#DCC4B6',
      'bg-[#C4D0C4]': '#C4D0C4',
      'bg-[#C4CCD4]': '#C4CCD4',
      'bg-[#DCC4D4]': '#DCC4D4',
      'bg-[#E4C4C4]': '#E4C4C4',
      'bg-[#E4E4C4]': '#E4E4C4',
      'bg-[#D4D4D4]': '#D4D4D4',
      'bg-[#B6C4CC]': '#B6C4CC',
      'bg-[#E0E0E0]': '#E0E0E0',
    };
    
    ctx.fillStyle = colorMap[colorClass] || '#f5f5f4';
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Simple text wrapping
    const words = title.split(' ');
    let line = '';
    let y = 256 - ((words.length > 3 ? 2 : 1) * 24);
    
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 400 && n > 0) {
        ctx.fillText(line, 256, y);
        line = words[n] + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 256, y);
    
    return canvas.toDataURL('image/png');
  }

  public play(text: string, title: string, author: string = 'Folio', coverColor: string = 'bg-[#E8DCC4]') {
    // 1. Reset state
    this.stop(); 

    if (!text.trim()) return;

    this.isPlaying = true;
    
    // 2. Advanced Chunking
    // Split by sentence but keep delimiters.
    const sentences = text.match(/[^.?!]+[.?!]+[\])'"]*|[^.?!]+$/g) || [text];
    
    this.queue = [];
    sentences.forEach(s => {
        const trimmed = s.trim();
        if (trimmed) {
            // Break huge chunks if necessary
            if (trimmed.length > 200) {
                const parts = trimmed.match(/.{1,200}(?:\s|$)/g) || [trimmed];
                this.queue.push(...parts);
            } else {
                this.queue.push(trimmed);
            }
        }
    });

    // Pre-calc lengths for accurate seeking
    this.queueLengths = this.queue.map(s => s.length);
    this.totalLength = this.queueLengths.reduce((a, b) => a + b, 0);
    
    this.currentTextIndex = 0;
    this.resumeCharIndex = 0;

    // Update State Basic Info
    this.state = {
        ...this.state,
        isPlaying: true,
        title,
        author,
        coverColor,
        hasContent: true,
        progress: 0,
        currentSegment: 0,
        totalSegments: this.queue.length
    };
    this.updateProgressState();

    // 3. Background Audio
    this.playPromise = this.audio.play();
    if (this.playPromise !== undefined) {
      this.playPromise.catch(e => {
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
             console.warn("Background audio start failed:", e);
        }
      });
    }

    // 4. Media Session
    if ('mediaSession' in navigator) {
      const coverImage = this.generateCoverImage(title, coverColor);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: author,
        album: 'Folio Audio',
        artwork: [{ src: coverImage, sizes: '512x512', type: 'image/png' }]
      });

      try {
          navigator.mediaSession.setActionHandler('play', () => this.resume());
          navigator.mediaSession.setActionHandler('pause', () => this.pause());
          navigator.mediaSession.setActionHandler('stop', () => this.stop());
          navigator.mediaSession.setActionHandler('previoustrack', () => this.prevChunk());
          navigator.mediaSession.setActionHandler('nexttrack', () => this.nextChunk());
      } catch (e) {
          console.warn("Media Session actions not fully supported", e);
      }
    }

    // 5. Speak
    this.speakNextChunk(0);
  }

  private speakNextChunk(offset: number = 0) {
    if (!this.isPlaying) return;

    if (this.currentTextIndex >= this.queue.length) {
      this.stop(); 
      return;
    }

    this.updateProgressState();

    // Cancel any ongoing speech
    this.synth.cancel();

    const originalText = this.queue[this.currentTextIndex];
    // If offset is provided, speak substring to resume mid-sentence
    const textToSpeak = offset > 0 ? originalText.substring(offset) : originalText;

    if (!textToSpeak.trim()) {
         // Skip empty or finished chunks
         this.currentTextIndex++;
         this.resumeCharIndex = 0;
         setTimeout(() => this.speakNextChunk(0), 0);
         return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.volume = this.state.volume;
    
    this.currentUtterance = utterance;

    // Track word boundaries for precise resume
    utterance.onboundary = (e) => {
        if (e.name === 'word') {
            // e.charIndex is relative to textToSpeak. We need absolute index in originalText.
            this.resumeCharIndex = offset + e.charIndex;
            // Optional: Update progress continuously (smooth slider)
            // this.updateProgressState(); 
        }
    };

    utterance.onend = () => {
      // Check isPlaying to prevent auto-advance if paused/stopped
      if (this.isPlaying) {
        this.currentTextIndex++;
        this.resumeCharIndex = 0; // Reset for next chunk
        // Recursion via timeout to prevent stack depth or engine blocking
        setTimeout(() => this.speakNextChunk(0), 0);
      }
    };

    utterance.onerror = (e) => {
      // Only advance if we are supposed to be playing and not interrupted
      if (this.isPlaying && e.error !== 'interrupted') {
          this.currentTextIndex++;
          this.resumeCharIndex = 0;
          setTimeout(() => this.speakNextChunk(0), 100);
      }
    };

    this.synth.speak(utterance);
    
    // Ensure background audio is running
    if (this.audio.paused && this.isPlaying) {
         const p = this.audio.play();
         if (p) p.catch(() => {});
    }
  }

  public pause() {
    this.isPlaying = false;
    this.state.isPlaying = false;
    this.notify();
    
    // Stop speech immediately. 
    // resumeCharIndex retains the last value from onboundary.
    this.synth.cancel();
    this.audio.pause();
  }

  public resume() {
    if (!this.isPlaying && this.queue.length > 0) {
        this.isPlaying = true;
        this.state.isPlaying = true;
        this.notify();

        const p = this.audio.play();
        if (p) p.catch(() => {});
        
        // Resume from specific char index
        this.speakNextChunk(this.resumeCharIndex);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.state = {
        ...this.state,
        isPlaying: false,
        hasContent: false,
        progress: 0,
        currentSegment: 0,
        totalSegments: 0
    };
    this.notify();

    this.synth.cancel();
    if (!this.audio.paused) this.audio.pause();
    
    this.audio.currentTime = 0;
    this.currentUtterance = null;
    this.queue = [];
    this.queueLengths = [];
    this.totalLength = 0;
    this.currentTextIndex = 0;
    this.resumeCharIndex = 0;
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
    }
  }

  public nextChunk() {
     this.synth.cancel();
     this.currentTextIndex++;
     this.resumeCharIndex = 0;
     if (this.currentTextIndex >= this.queue.length) this.currentTextIndex = 0; 
     this.speakNextChunk(0);
  }

  public prevChunk() {
     this.synth.cancel();
     this.currentTextIndex = Math.max(0, this.currentTextIndex - 1);
     this.resumeCharIndex = 0;
     this.speakNextChunk(0);
  }

  public seek(percent: number) {
      if (this.totalLength === 0 || this.queue.length === 0) return;

      // Calculate target character position
      const targetChar = (Math.max(0, Math.min(100, percent)) / 100) * this.totalLength;
      
      let acc = 0;
      let foundIndex = 0;
      let foundOffset = 0;

      // Find which chunk and offset this corresponds to
      for (let i = 0; i < this.queueLengths.length; i++) {
          const len = this.queueLengths[i];
          if (acc + len > targetChar) {
              foundIndex = i;
              foundOffset = Math.floor(targetChar - acc);
              break;
          }
          acc += len;
      }
      
      // Edge case: seeking to very end
      if (acc >= targetChar && foundIndex === 0 && acc > 0) {
          foundIndex = this.queueLengths.length - 1;
          foundOffset = 0;
      }
      
      // Update state
      this.currentTextIndex = foundIndex;
      this.resumeCharIndex = foundOffset;
      this.updateProgressState();
      
      // If playing, restart speech from new point
      if (this.isPlaying) {
          this.synth.cancel();
          this.speakNextChunk(foundOffset);
      }
  }
}

export const audioService = new AudioService();

export const extractTextFromBook = (book: BookData): string => {
    if (!book || !book.pages) return "";
    return book.pages.map(page => 
        page.blocks
            .filter(b => b.type === 'text')
            .map(b => b.content)
            .join('. ')
    ).join('. \n');
};