import React, { useRef } from 'react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  previewUrl?: string;
  icon?: React.ReactNode;
  isVideo?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  onFileSelect, 
  previewUrl, 
  icon,
  isVideo
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div 
        onClick={() => inputRef.current?.click()}
        className={`
          relative w-full aspect-[9/16] max-h-64 sm:max-h-80 rounded-xl border-2 border-dashed 
          ${previewUrl ? 'border-shorts-red' : 'border-gray-700 hover:border-gray-500'} 
          bg-[#181818] cursor-pointer overflow-hidden flex flex-col items-center justify-center transition-all group
        `}
      >
        {previewUrl ? (
          isVideo ? (
            <video src={previewUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" muted loop autoPlay />
          ) : (
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
          )
        ) : (
          <div className="text-gray-500 flex flex-col items-center p-4 text-center">
            <span className="mb-2 text-3xl">{icon || '📁'}</span>
            <span className="text-sm">Click to upload</span>
          </div>
        )}
        
        {previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">Change</span>
          </div>
        )}
        
        <input 
          ref={inputRef}
          type="file" 
          accept={accept} 
          className="hidden" 
          onChange={handleChange}
        />
      </div>
    </div>
  );
};
