declare function ffmpeg(command?: string): any;

export default ffmpeg;

export function setFfmpegPath(path: string): void;
export function ffprobe(path: string, callback: (err: Error | null, metadata: any) => void): void;
