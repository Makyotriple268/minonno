import React from 'react';
import { FileUpload } from './FileUpload';
import { fileToBase64 } from '../services/utils';

interface CharacterInputProps {
  label: string;
  mode: 'upload' | 'text';
  onModeChange: (mode: 'upload' | 'text') => void;
  imagePreview: string | null;
  onImageSelect: (base64: string) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  placeholder?: string;
}

export const CharacterInput: React.FC<CharacterInputProps> = ({
  label,
  mode,
  onModeChange,
  imagePreview,
  onImageSelect,
  description,
  onDescriptionChange,
  placeholder
}) => {
  const handleFile = async (file: File) => {
    try {
      const base64 = await fileToBase64(file);
      onImageSelect(base64);
    } catch (e) {
      alert("Error reading file");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        <div className="flex bg-[#181818] rounded-lg p-1 border border-gray-700">
          <button 
            onClick={() => onModeChange('upload')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'upload' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >Upload</button>
          <button 
            onClick={() => onModeChange('text')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'text' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >Describe</button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="h-full">
          <FileUpload 
            label="" 
            accept="image/*" 
            onFileSelect={handleFile} 
            previewUrl={imagePreview || undefined}
            icon={<span className="text-3xl">👤</span>}
          />
        </div>
      ) : (
        <div className="w-full aspect-[9/16] max-h-64 sm:max-h-80">
          <textarea 
            className="w-full h-full bg-[#181818] border border-gray-700 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-shorts-red resize-none placeholder-gray-600 text-gray-200 leading-relaxed"
            placeholder={placeholder || "Describe the character..."}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
