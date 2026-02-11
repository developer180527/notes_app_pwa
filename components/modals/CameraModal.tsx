import React, { useRef, useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { BookData } from '../../types';
import { COLORS, generateId } from '../../utils/helpers';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBook: (book: BookData) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onSaveBook }) => {
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScannedImages([]);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
      onClose();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setScannedImages(prev => [...prev, dataUrl]);
      }
    }
  };

  const generatePDFAndSave = async () => {
    if (scannedImages.length === 0) return;
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 210;
        const pageHeight = 297;

        scannedImages.forEach((imgData, index) => {
            if (index > 0) pdf.addPage();
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pageWidth;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            const y = pdfHeight < pageHeight ? (pageHeight - pdfHeight) / 2 : 0;
            pdf.addImage(imgData, 'JPEG', 0, y, pdfWidth, pdfHeight);
        });

        const pdfBase64 = pdf.output('datauristring');
        const timestamp = new Date().toISOString().slice(0, 10);
        
        const newBook: BookData = {
          id: generateId(),
          title: `Scanned Doc ${timestamp}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          pages: [
            { 
                id: generateId(), 
                blocks: [
                    { 
                        id: generateId(), 
                        type: 'file', 
                        content: pdfBase64,
                        meta: { name: `Scan-${timestamp}.pdf`, size: 'PDF' }
                    },
                    ...scannedImages.map(img => ({
                        id: generateId(),
                        type: 'image' as const,
                        content: img
                    }))
                ] 
            }
          ],
          coverColor: COLORS[0]
        };

        onSaveBook(newBook);
        onClose();

    } catch (e) {
        console.error("PDF Generation failed", e);
        alert("Failed to generate PDF.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
        <div className="relative flex-1 bg-black overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {/* Captured Thumbnails */}
            {scannedImages.length > 0 && (
                <div className="absolute top-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {scannedImages.map((img, idx) => (
                        <div key={idx} className="w-16 h-20 bg-stone-800 rounded-lg border border-white/20 shrink-0 overflow-hidden relative">
                            <img src={img} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1">{idx+1}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
        <div className="h-32 bg-stone-900 flex items-center justify-between px-8">
            <button onClick={onClose} className="text-white p-4 rounded-full hover:bg-white/10">
                <X size={24} />
            </button>
            
            <button onClick={captureImage} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform">
                <div className="w-14 h-14 bg-white rounded-full"></div>
            </button>
            
            <button onClick={generatePDFAndSave} className={`text-white p-4 rounded-full hover:bg-white/10 ${scannedImages.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <Check size={24} />
            </button>
        </div>
    </div>
  );
};

export default CameraModal;