import { GoogleGenAI, Type } from "@google/genai";
import { Scene } from "../types";
import { fileToBase64, extractFrameFromVideo } from "./utils";

// Initialize Gemini Client
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Retry helper for API limits
const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3, baseDelayMs = 5000): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("Quota");
      if (isRateLimit && i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        console.warn(`Rate limit or quota hit. Retrying in ${delay / 1000}s... (Attempt ${i + 1} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
};

export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
     return await window.aistudio.hasSelectedApiKey();
  }
  return true; 
};

export const requestApiKey = async () => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};

export const analyzeVideoStyle = async (videoFile: File): Promise<string> => {
  const ai = getAiClient();
  
  let base64Image: string | null = null;
  
  try {
     base64Image = await extractFrameFromVideo(videoFile);
  } catch (e) {
     console.warn("Frame extraction failed", e);
     if (videoFile.size < 10 * 1024 * 1024) {
        try {
          base64Image = await fileToBase64(videoFile);
        } catch (err) {
          console.warn("Fallback upload failed", err);
        }
     }
  }

  if (!base64Image) {
    return "Cinematic, high definition, viral youtube shorts aesthetic, dynamic lighting";
  }
  
  const modelId = "gemini-3-flash-preview"; 

  const prompt = `
    Analyze this image frame from a video. Describe the visual style, color palette, lighting, 
    and overall "vibe" (e.g., cyberpunk, fast-paced, minimalist, cinematic). 
    Keep it concise (under 50 words). This description will be used to generate similar images.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image! } },
          { text: prompt },
        ],
      },
    }));
    return response.text || "Cinematic, high quality, trending on social media";
  } catch (error) {
    console.error("Video analysis failed", error);
    return "Cinematic, high quality";
  }
};

export const generateScenesFromScript = async (
  script: string, 
  styleContext: string,
  sceneCount: number,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<Scene[]> => {
  const ai = getAiClient();
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are an expert Director of Photography and Storyboard Artist for viral YouTube Shorts.
    Your goal is to create a visual flow.
    
    Break down the following script into EXACTLY ${sceneCount} visual scenes. 
    
    CRITICAL INSTRUCTIONS FOR VISUALS:
    1. ANALYZE CONTEXT: Read the ENTIRE script first to understand the specific niche/topic (e.g., Car History, Cooking, Tech Review). All visuals must be grounded in this reality.
    2. NO ABSTRACT METAPHORS: If the script states a fact (e.g., "Speed became accessible"), visualize the LITERAL subject matter (e.g., a vintage car driving), not an abstract color wash or surreal shape.
    3. DYNAMIC CINEMATOGRAPHY: Use specific camera angles (Low angle, Dutch angle, Bird's eye, Extreme Close-up) to make the literal subject look exciting.
    4. CHARACTER: If the script allows, place "the main character" in the scene interacting with the subject or reacting to it.
    5. The visual style context is: ${styleContext}.
    ${aspectRatio === '16:9' ? '6. 16:9 STYLE: Use a 2D stickman animation style with simple, uncomplicated backgrounds. Optionally add short, engaging on-screen text for key points.' : ''}
    
    IMPORTANT: 
    - Generate EXACTLY ${sceneCount} scenes to cover the ENTIRE script.
    
    Return a list of scenes. For each scene provide:
    1. The segment of the script being spoken.
    2. A detailed visual prompt. MUST include specific camera instructions (e.g., "Wide shot from below," "Extreme close up on eyes").
       If the script mentions a character, refer to them as "the main character". If there are multiple characters, refer to them by their descriptions.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: [
        { text: prompt },
        { text: `SCRIPT:\n${script}` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              scriptSegment: { type: Type.STRING },
              visualPrompt: { type: Type.STRING, description: "Detailed, dynamic image generation prompt with camera angles" },
            },
            required: ["scriptSegment", "visualPrompt"],
          },
        },
      },
    }));

    if (response.text) {
      const rawScenes = JSON.parse(response.text);
      return rawScenes.map((s: any, index: number) => ({
        id: `scene-${index}-${Date.now()}`,
        scriptSegment: s.scriptSegment,
        visualPrompt: s.visualPrompt,
        status: 'pending'
      }));
    }
    return [];
  } catch (error) {
    console.error("Scene generation failed", error);
    throw error;
  }
};

/**
 * Regenerates the visual prompt for a specific scene segment to get a new creative angle.
 */
export const regenerateVisualPrompt = async (
  scriptSegment: string,
  styleContext: string,
  currentPrompt: string
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are an expert Director of Photography.
    
    Current Prompt: "${currentPrompt}"
    Script Segment: "${scriptSegment}"
    Style: "${styleContext}"

    Task: Rewrite the visual prompt for this scene.
    
    CRITICAL: 
    - The previous prompt might have been too abstract or hallucinated.
    - Make the new prompt LITERAL and GROUNDED in the script's specific meaning.
    - If the script describes an object or event, describe that object/event clearly.
    - Maintain dynamic camera angles.
    
    Return ONLY the new visual description text.
  `;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: prompt }] },
    }));
    return response.text || currentPrompt;
  } catch (error) {
    console.error("Prompt regeneration failed", error);
    return currentPrompt;
  }
};


export interface CharConfig {
  image: string | null;
  description: string | null;
}

/**
 * Generates an image for a specific scene using up to two character references.
 */
export const generateSceneImage = async (
  scene: Scene, 
  mainChar: CharConfig,
  secondChar: CharConfig,
  aspectRatio: "16:9" | "9:16" = "9:16"
): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash-image"; 

  const parts: any[] = [];
  let promptText = "";

  // 1. Add Main Character Reference
  if (mainChar.image) {
    parts.push({
      inlineData: { mimeType: "image/png", data: mainChar.image },
    });
    promptText += "REFERENCE IMAGE 1: MAIN CHARACTER. Use this image as the primary reference for the main subject.\n";
  }
  if (mainChar.description) {
    promptText += `MAIN CHARACTER DESCRIPTION: ${mainChar.description}\n`;
  }

  // 2. Add Second Character Reference
  if (secondChar.image) {
    parts.push({
      inlineData: { mimeType: "image/png", data: secondChar.image },
    });
    promptText += "REFERENCE IMAGE 2: SECONDARY CHARACTER. Use this image as the reference for the second character if present in the scene.\n";
  }
  if (secondChar.description) {
    promptText += `SECONDARY CHARACTER DESCRIPTION: ${secondChar.description}\n`;
  }

  // 3. Main Scene Prompt
  promptText += `
    \nGENERATE SCENE:
    Action/Composition: ${scene.visualPrompt}
    
    CRITICAL INSTRUCTIONS:
    1. Aspect Ratio: ${aspectRatio} (${aspectRatio === '9:16' ? 'Vertical for YouTube Shorts' : 'Horizontal for Long-form Videos'}).
    2. Style: ${aspectRatio === '16:9' ? '2D stickman animation, consistent character design, simple and uncluttered background. Incorporate engaging short text on-screen if conceptually important.' : 'High budget, cinematic, detailed.'}
    3. Consistency: Maintain the facial features and clothing of the referenced characters.
    4. Environment: Use the environment from Reference Image 1 if available, unless the scene prompt explicitly changes the location.
    5. If the scene prompt involves both characters, position them naturally.
  `;

  parts.push({ text: promptText });

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed", error);
    throw error;
  }
};
