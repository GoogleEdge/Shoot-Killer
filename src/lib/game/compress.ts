const MAX_EDGE = 720;
const QUALITY = 0.62;

function canvasToJpeg(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", QUALITY);
}

export async function blobToJpegDataUrl(blob: Blob): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法处理照片");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const url = canvasToJpeg(canvas);
    if (url.length > 460_000) {
      return canvas.toDataURL("image/jpeg", 0.45);
    }
    return url;
  } catch {
    return await fileReaderFallback(blob);
  }
}

function fileReaderFallback(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取照片失败"));
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法处理照片"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvasToJpeg(canvas));
      };
      img.onerror = () => reject(new Error("照片格式不支持"));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

export function videoFrameToJpeg(video: HTMLVideoElement): string {
  const w = video.videoWidth || 720;
  const h = video.videoHeight || 960;
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法截取画面");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvasToJpeg(canvas);
}
