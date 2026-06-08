import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Scene, AppStep } from './types';
import { analyzeVideoStyle, generateScenesFromScript, generateSceneImage, regenerateVisualPrompt } from './services/geminiService';
import { cleanBase64 } from './services/utils';
import { FileUpload } from './components/FileUpload';
import { CharacterInput } from './components/CharacterInput';
import { SceneCard } from './components/SceneCard';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generationProgress, setGenerationProgress] = useState<{ completed: number; total: number } | null>(null);
  
  // Character 1 Inputs
  const [char1Mode, setChar1Mode] = useState<'upload' | 'text'>('upload');
  const [char1Image, setChar1Image] = useState<string | null>(null);
  const [char1Desc, setChar1Desc] = useState('');

  // Character 2 Inputs
  const [char2Mode, setChar2Mode] = useState<'upload' | 'text'>('upload');
  const [char2Image, setChar2Image] = useState<string | null>(null);
  const [char2Desc, setChar2Desc] = useState('');
  
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [script, setScript] = useState('');
  const [sceneCount, setSceneCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  
  const [stylePrompt, setStylePrompt] = useState("Cinematic, high definition, viral youtube shorts aesthetic, dynamic lighting");
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  
  const [styleDescription, setStyleDescription] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);

  const handleVideoUpload = async (file: File) => {
    setReferenceVideo(file);
    setReferenceVideoUrl(URL.createObjectURL(file));

    setIsAnalyzingStyle(true);
    try {
        const analyzedStyle = await analyzeVideoStyle(file);
        setStylePrompt(analyzedStyle);
    } catch (e) {
        console.error("Style analysis failed", e);
    } finally {
        setIsAnalyzingStyle(false);
    }
  };

  const startStoryboard = async () => {
    if (!script.trim()) return alert("Please enter a script");
    if (sceneCount < 1 || sceneCount > 200) return alert("Please choose between 1 and 200 scenes");
    
    setLoading(true);
    setStep(AppStep.STORYBOARD);
    
    try {
      const currentStyle = stylePrompt;
      setStyleDescription(currentStyle);
      
      setLoadingMessage('Director AI is planning your shots...');
      const generatedScenes = await generateScenesFromScript(script, currentStyle, sceneCount, aspectRatio);
      setScenes(generatedScenes);
      
      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Failed to generate storyboard. See console for details.");
      setStep(AppStep.SETUP);
      setLoading(false);
    }
  };

  const getCleanCharConfig = (mode: 'upload' | 'text', image: string | null, desc: string) => {
    return {
      image: (mode === 'upload' && image) ? cleanBase64(image) : null,
      description: (mode === 'text') ? desc : null
    };
  };

  const generateAllImages = async () => {
    const scenesToGenerate = scenes.filter(s => s.status !== 'completed');
    if (scenesToGenerate.length === 0) {
        alert("All scenes are already generated!");
        return;
    }

    setGenerationProgress({ completed: 0, total: scenesToGenerate.length });
    setScenes(prev => prev.map(s => s.status === 'completed' ? s : { ...s, status: 'generating' }));

    const mainChar = getCleanCharConfig(char1Mode, char1Image, char1Desc);
    const secondChar = getCleanCharConfig(char2Mode, char2Image, char2Desc);
    
    let completedCount = 0;
    
    for (const scene of scenes) {
        if (scene.status === 'completed') continue;

        try {
            const base64Image = await generateSceneImage(scene, mainChar, secondChar, aspectRatio);
            
            setScenes(current => current.map(s => {
                if (s.id === scene.id) {
                    return { ...s, status: 'completed', imageUrl: base64Image };
                }
                return s;
            }));
        } catch (e) {
            console.error(`Failed scene ${scene.id}`, e);
            setScenes(current => current.map(s => {
                if (s.id === scene.id) {
                    return { ...s, status: 'error' };
                }
                return s;
            }));
        } finally {
            completedCount++;
            setGenerationProgress({ completed: completedCount, total: scenesToGenerate.length });
            
            // Artificial delay to prevent hitting rate limits
            if (completedCount < scenesToGenerate.length) {
              await new Promise(r => setTimeout(r, 4000));
            }
        }
    }
    
    setTimeout(() => setGenerationProgress(null), 1000);
  };

  const generateSingleScene = async (targetScene: Scene) => {
     setScenes(current => current.map(s => s.id === targetScene.id ? { ...s, status: 'generating' } : s));
     
     const mainChar = getCleanCharConfig(char1Mode, char1Image, char1Desc);
     const secondChar = getCleanCharConfig(char2Mode, char2Image, char2Desc);
     
     try {
        const base64Image = await generateSceneImage(targetScene, mainChar, secondChar, aspectRatio);
        setScenes(current => current.map(s => {
            if (s.id === targetScene.id) {
                return { ...s, status: 'completed', imageUrl: base64Image };
            }
            return s;
        }));
     } catch (e) {
        setScenes(current => current.map(s => s.id === targetScene.id ? { ...s, status: 'error' } : s));
     }
  };

  const refreshScenePrompt = async (targetScene: Scene) => {
    const currentStyle = styleDescription || "Cinematic";
    
    try {
        const newPrompt = await regenerateVisualPrompt(targetScene.scriptSegment, currentStyle, targetScene.visualPrompt);
        
        setScenes(current => current.map(s => {
            if (s.id === targetScene.id) {
                return { 
                    ...s, 
                    visualPrompt: newPrompt,
                    // If we change the prompt, the old image doesn't match anymore. 
                    // Let's clear it so the user knows they need to regenerate.
                    imageUrl: undefined, 
                    status: 'pending' 
                };
            }
            return s;
        }));
    } catch (e) {
        console.error("Failed to refresh prompt", e);
    }
  };

  const downloadAllImages = async () => {
    const completedScenes = scenes.filter(s => s.imageUrl);
    
    if (completedScenes.length === 0) {
      alert("No generated images to download yet! Click 'Generate All Images' first.");
      return;
    }

    if (completedScenes.length < scenes.length) {
       const confirm = window.confirm(`Only ${completedScenes.length} of ${scenes.length} scenes are ready. Download them anyway?`);
       if (!confirm) return;
    }

    for (let i = 0; i < completedScenes.length; i++) {
      const scene = completedScenes[i];
      if (scene.imageUrl) {
        const link = document.createElement('a');
        link.href = scene.imageUrl;
        const paddedIndex = (i + 1).toString().padStart(2, '0');
        link.download = `scene_${paddedIndex}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans selection:bg-shorts-red selection:text-white">
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0F0F0F]/90 backdrop-blur-md border-b border-gray-800 h-16 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-shorts-red rounded-lg flex items-center justify-center font-bold text-white">S</div>
           <h1 className="text-xl font-bold tracking-tight">Shorts AI <span className="text-gray-500 font-normal">Storyboarder</span></h1>
        </div>
        
        <div className="flex gap-4">
          {step === AppStep.STORYBOARD && (
            <>
              <button 
                onClick={downloadAllImages}
                className="text-sm font-semibold text-shorts-accent hover:text-blue-400 transition-colors flex items-center gap-1"
                disabled={!!generationProgress}
              >
                <span>⬇️</span> Download Images
              </button>
              <button 
                onClick={() => setStep(AppStep.SETUP)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
                disabled={!!generationProgress}
              >
                Start Over
              </button>
            </>
          )}
        </div>
      </header>

      <main className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
        
        {step === AppStep.SETUP && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
            {/* Left Col: Inputs */}
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Create your next viral Short.</h2>
                <p className="text-gray-400">Import up to two characters, define a style, and let AI visualize your script.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                
                {/* Main Character */}
                <CharacterInput
                  label="Main Character"
                  mode={char1Mode}
                  onModeChange={setChar1Mode}
                  imagePreview={char1Image}
                  onImageSelect={setChar1Image}
                  description={char1Desc}
                  onDescriptionChange={setChar1Desc}
                  placeholder="Describe your main character... e.g., 'A futuristic samurai with a glowing blue katana'"
                />

                {/* Second Character */}
                <CharacterInput
                  label="Second Character (Optional)"
                  mode={char2Mode}
                  onModeChange={setChar2Mode}
                  imagePreview={char2Image}
                  onImageSelect={setChar2Image}
                  description={char2Desc}
                  onDescriptionChange={setChar2Desc}
                  placeholder="Describe a sidekick, villain, or secondary character..."
                />

                {/* Style Video - Spanning full width if needed, or just next row */}
                <div className="col-span-2">
                   <div className="h-px bg-gray-800 my-2"></div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                   <FileUpload 
                      label="Style Reference Video (Optional)" 
                      accept="video/*" 
                      onFileSelect={handleVideoUpload} 
                      previewUrl={referenceVideoUrl || undefined}
                      isVideo={true}
                      icon={<span className="text-3xl">🎥</span>}
                    />
                </div>
              </div>

              {/* Style Editor */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-400">Visual Style & Art Direction</label>
                    {isAnalyzingStyle && (
                        <span className="text-xs font-semibold text-shorts-accent animate-pulse flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-shorts-accent"></span>
                            Extracting style from video...
                        </span>
                    )}
                 </div>
                 <textarea
                    className="w-full bg-[#181818] border border-gray-700 rounded-xl p-4 text-sm leading-relaxed text-gray-200 focus:outline-none focus:ring-2 focus:ring-shorts-red resize-none transition-all placeholder-gray-600"
                    rows={3}
                    placeholder="Describe the look and feel (e.g., 'Cyberpunk city, neon lights, high contrast, 3D render')"
                    value={stylePrompt}
                    onChange={(e) => setStylePrompt(e.target.value)}
                 />
              </div>
            </div>

            {/* Right Col: Script & Action */}
            <div className="flex flex-col h-full space-y-6">
               <label className="block text-sm font-medium text-gray-400">Video Script</label>
               <textarea
                 className="flex-1 w-full bg-[#1E1E1E] border border-gray-700 rounded-xl p-6 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-shorts-red resize-none transition-all placeholder-gray-600"
                 placeholder="Paste your YouTube Short script here... (e.g., 'Did you know that octopuses have three hearts? It's true! Two pump blood to the gills...')"
                 value={script}
                 onChange={(e) => setScript(e.target.value)}
               />

               <div className="bg-[#181818] p-4 rounded-xl border border-gray-700 space-y-3">
                  <label className="text-sm font-medium text-gray-400 block">Number of Scenes</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={sceneCount}
                      onChange={(e) => setSceneCount(Number(e.target.value))}
                      className="bg-[#252525] border border-gray-700 text-white rounded-lg p-3 w-24 text-center text-lg focus:outline-none focus:border-shorts-red"
                    />
                    <span className="text-sm text-gray-500">Pick the total number of scenes you want for this clip (1-200).</span>
                  </div>
               </div>

               <div className="bg-[#181818] p-4 rounded-xl border border-gray-700 space-y-3">
                  <label className="text-sm font-medium text-gray-400 block">Video Format</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAspectRatio("9:16")}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-1 ${aspectRatio === "9:16" ? 'bg-shorts-red/10 border-shorts-red text-white' : 'bg-[#252525] border-transparent text-gray-400 hover:bg-[#303030]'}`}
                    >
                      <span className="flex items-center gap-2">📱 Shorts (9:16)</span>
                      <span className="text-xs opacity-60 font-normal">Vertical video format</span>
                    </button>
                    <button
                      onClick={() => setAspectRatio("16:9")}
                      className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-1 ${aspectRatio === "16:9" ? 'bg-shorts-red/10 border-shorts-red text-white' : 'bg-[#252525] border-transparent text-gray-400 hover:bg-[#303030]'}`}
                    >
                      <span className="flex items-center gap-2">📺 Long-form (16:9)</span>
                      <span className="text-xs opacity-60 font-normal">Horizontal video format</span>
                    </button>
                  </div>
               </div>
               
               <button
                 onClick={startStoryboard}
                 disabled={loading || !script.trim()}
                 className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all
                    ${loading || !script.trim() ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-shorts-red hover:text-white hover:scale-[1.02]'}
                 `}
               >
                 {loading ? (
                   <>
                     <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <span>{loadingMessage}</span>
                   </>
                 ) : (
                   <>
                     <span>Generate Storyboard</span>
                     <span>→</span>
                   </>
                 )}
               </button>
            </div>
          </div>
        )}

        {step === AppStep.STORYBOARD && (
           <div className="space-y-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                 <div>
                    <h2 className="text-2xl font-bold">Storyboard</h2>
                    <p className="text-gray-400 text-sm mt-1 max-w-xl truncate">
                       {scenes.length} Scenes • Style: <span className="text-shorts-accent">{styleDescription || 'Default'}</span>
                    </p>
                 </div>
                 
                 {generationProgress ? (
                   <div className="flex items-center gap-4 bg-[#1E1E1E] border border-gray-700 px-6 py-3 rounded-full shadow-lg">
                      <div className="w-5 h-5 border-2 border-shorts-red border-t-transparent rounded-full animate-spin"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          Generating {generationProgress.completed < generationProgress.total ? generationProgress.completed + 1 : generationProgress.total} of {generationProgress.total}
                        </span>
                        <div className="w-32 h-1 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-shorts-red transition-all duration-300 ease-out"
                            style={{ width: `${(generationProgress.completed / generationProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                   </div>
                 ) : (
                   <button
                      onClick={generateAllImages}
                      className="bg-shorts-red hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                   >
                      <span className="text-xl">✨</span> Generate All Images
                   </button>
                 )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {scenes.map((scene, idx) => (
                    <SceneCard 
                      key={scene.id} 
                      scene={scene} 
                      index={idx} 
                      onRegenerate={generateSingleScene}
                      onRefreshPrompt={refreshScenePrompt}
                      aspectRatio={aspectRatio}
                    />
                  ))}
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
