export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const cleanBase64 = (dataUrl: string): string => {
  if (dataUrl.includes(',')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
};

export const extractFrameFromVideo = (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Timeout safety to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error("Video frame extraction timed out"));
      cleanup();
    }, 4000);

    const url = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    
    const cleanup = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    
    // 2. Capture extremely early to speed up seek time
    const captureTime = 0.1; 

    video.onloadeddata = () => {
      video.currentTime = Math.min(captureTime, video.duration);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      
      // 3. Resize to small dimensions for fast processing and upload
      const maxDim = 512;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      // Maintain aspect ratio but scale down
      if (width > maxDim || height > maxDim) {
        const ratio = width / height;
        if (ratio > 1) {
            width = maxDim;
            height = maxDim / ratio;
        } else {
            height = maxDim;
            width = maxDim * ratio;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        // 4. Low quality JPEG for efficient API payload
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        resolve(dataUrl.split(",")[1]);
      } else {
        reject(new Error("Canvas init failed"));
      }
      cleanup();
    };

    video.onerror = (e) => {
      reject(e);
      cleanup();
    };
  });
};