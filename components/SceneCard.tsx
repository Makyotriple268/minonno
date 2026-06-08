import React, { useState } from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  index: number;
  onRegenerate: (scene: Scene) => void;
  onRefreshPrompt: (scene: Scene) => Promise<void>;
  aspectRatio?: "16:9" | "9:16";
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, onRegenerate, onRefreshPrompt, aspectRatio = "9:16" }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefreshPrompt(scene);
    setIsRefreshing(false);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scene.imageUrl) {
      const a = document.createElement('a');
      a.href = scene.imageUrl;
      const extension = scene.imageUrl.startsWith('data:image/png') ? 'png' : 'jpeg';
      a.download = `scene-${index + 1}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const aspectClass = aspectRatio === "16:9" ? "aspect-video" : "aspect-[9/16]";

  return (
    <div className="flex flex-col bg-[#1E1E1E] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all shadow-lg">
      <div className={`relative w-full ${aspectClass} bg-black group`}>
        {scene.imageUrl ? (
          <img src={scene.imageUrl} alt={`Scene ${index + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center">
             {scene.status === 'generating' ? (
               <>
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-shorts-red mb-3"></div>
                 <span className="text-xs animate-pulse">Creating Visuals...</span>
               </>
             ) : (
               <span>Waiting for generation...</span>
             )}
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-3">
           <button 
             onClick={() => onRegenerate(scene)}
             className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transform transition-transform hover:scale-105 w-32"
             disabled={scene.status === 'generating'}
           >
             {scene.imageUrl ? 'Regenerate' : 'Generate'}
           </button>
           {scene.imageUrl && (
             <button 
               onClick={handleDownload}
               className="bg-shorts-red text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-600 transform transition-transform hover:scale-105 flex items-center justify-center gap-2 w-32"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
               Download
             </button>
           )}
        </div>

        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded">
          Scene {index + 1}
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Script</h4>
            <p className="text-sm text-gray-200 leading-relaxed italic">"{scene.scriptSegment}"</p>
        </div>
        <div>
            <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visual Prompt</h4>
                <button 
                  onClick={handleRefreshClick} 
                  disabled={isRefreshing}
                  className={`text-xs flex items-center gap-1 transition-colors ${isRefreshing ? 'text-gray-500 cursor-wait' : 'text-shorts-accent hover:text-white'}`}
                  title="Generate a new visual description"
                >
                  {isRefreshing ? (
                     <span className="animate-spin">↻</span>
                  ) : (
                     <span>🔄 Refresh</span>
                  )}
                </button>
            </div>
            <p className={`text-xs text-gray-500 line-clamp-3 hover:line-clamp-none transition-all cursor-help ${isRefreshing ? 'opacity-50' : ''}`}>
               {scene.visualPrompt}
            </p>
        </div>
      </div>
    </div>
  );
};
