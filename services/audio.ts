import { BookData } from '../types';

// Silent WAV (universally supported)
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

class AudioService {
  private synth: SpeechSynthesis;
  private audio: HTMLAudioElement;
  private isPlaying: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private queue: string[] = [];
  private currentTextIndex: number = 0;
  private playPromise: Promise<void> | undefined;

  constructor() {
    this.synth = window.speechSynthesis;
    this.audio = new Audio(SILENT_AUDIO);
    this.audio.loop = true;
    this.audio.preload = 'auto';
    
    // Handle interruptions
    window.addEventListener('beforeunload', () => this.stop());
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

  // REMOVED async to keep execution in the user-gesture stack for SpeechSynthesis
  public play(text: string, title: string, author: string = 'Folio', coverColor: string = 'bg-[#E8DCC4]') {
    // 1. Reset state (cancel previous speech immediately)
    this.stop(); 

    if (!text.trim()) return;

    this.isPlaying = true;
    
    // 2. Advanced Chunking
    const sentences = text.match(/[^.?!]+[.?!]+[\])'"]*|.+/g) || [text];
    this.queue = [];
    
    sentences.forEach(s => {
        if (s.length > 200) {
            const parts = s.match(/.{1,200}(?:\s|$)/g) || [s];
            this.queue.push(...parts);
        } else {
            this.queue.push(s);
        }
    });
    
    this.currentTextIndex = 0;

    // 3. Trigger Background Audio Loop
    this.playPromise = this.audio.play();
    if (this.playPromise !== undefined) {
      this.playPromise.catch(e => {
        // Suppress expected interruptions and AbortErrors
        if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
             console.warn("Background audio start failed:", e);
        }
      });
    }

    // 4. Setup Media Session
    if ('mediaSession' in navigator) {
      const coverImage = this.generateCoverImage(title, coverColor);
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: author,
        album: 'Folio Audio',
        artwork: [
          { src: coverImage, sizes: '512x512', type: 'image/png' }
        ]
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

    // 5. Speak immediately
    this.speakNextChunk();
  }

  private speakNextChunk() {
    if (!this.isPlaying) return;

    if (this.currentTextIndex >= this.queue.length) {
      this.stop();
      return;
    }

    // Cancel any current speaking to force flush
    this.synth.cancel();

    const textChunk = this.queue[this.currentTextIndex];
    const utterance = new SpeechSynthesisUtterance(textChunk);
    
    this.currentUtterance = utterance;

    utterance.onend = () => {
      // Must verify we are still supposed to be playing
      if (this.isPlaying) {
        this.currentTextIndex++;
        // Use a small timeout to prevent engine hiccups
        setTimeout(() => this.speakNextChunk(), 10);
      }
    };

    utterance.onerror = (e) => {
      console.error("TTS Error", e);
      if (this.isPlaying) {
          this.currentTextIndex++;
          setTimeout(() => this.speakNextChunk(), 100);
      }
    };

    // Speak
    this.synth.speak(utterance);
    
    // Ensure Audio Element is active (fix for backgrounding)
    if (this.audio.paused && this.isPlaying) {
         const p = this.audio.play();
         if (p) p.catch(() => {});
    }
  }

  public pause() {
    this.isPlaying = false;
    this.synth.pause();
    this.audio.pause();
  }

  public resume() {
    if (this.synth.paused && this.isPlaying === false) {
        this.isPlaying = true;
        const p = this.audio.play();
        if (p) p.catch(() => {});
        this.synth.resume();
    } else if (!this.isPlaying && this.queue.length > 0) {
        this.isPlaying = true;
        const p = this.audio.play();
        if (p) p.catch(() => {});
        this.speakNextChunk();
    }
  }

  public stop() {
    this.isPlaying = false;
    this.synth.cancel();
    
    // Only pause if not already paused to avoid promise race conditions
    if (!this.audio.paused) {
        this.audio.pause();
    }
    
    this.audio.currentTime = 0;
    this.currentUtterance = null;
    this.queue = [];
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
    }
  }

  private nextChunk() {
     this.synth.cancel();
     this.currentTextIndex++;
     if (this.currentTextIndex >= this.queue.length) this.currentTextIndex = 0; 
     this.speakNextChunk();
  }

  private prevChunk() {
     this.synth.cancel();
     this.currentTextIndex = Math.max(0, this.currentTextIndex - 1);
     this.speakNextChunk();
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