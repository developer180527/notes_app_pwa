export const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const COLORS = [
  'bg-[#E8DCC4]', // Antique White
  'bg-[#DCC4B6]', // Dust Rose
  'bg-[#C4D0C4]', // Sage
  'bg-[#C4CCD4]', // Slate Blue
  'bg-[#DCC4D4]', // Lilac
  'bg-[#E4C4C4]', // Muted Red
  'bg-[#E4E4C4]', // Parchment
  'bg-[#D4D4D4]', // Silver
  'bg-[#B6C4CC]', // Cool Grey
  'bg-[#E0E0E0]', // Platinum
];