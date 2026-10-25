import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const BAR_COUNT = 1800;
const SAMPLE_RATE = 8000;
const cacheDir = path.join(process.cwd(), ".next/cache/admin-waveforms-v1");
const pending = new Map<string, Promise<number[]>>();
let queue: Promise<unknown> = Promise.resolve();

// Only retain one summary per bar, never the decoded recording.
export function createWaveformAccumulator(duration: number) {
  const squares = new Float64Array(BAR_COUNT);
  const maxima = new Float32Array(BAR_COUNT);
  const counts = new Uint32Array(BAR_COUNT);
  let sample = 0;
  let remainder = Buffer.alloc(0);
  return {
    write(chunk: Buffer) {
      const bytes = remainder.length ? Buffer.concat([remainder, chunk]) : chunk;
      const end = bytes.length - (bytes.length % 4);
      for (let offset = 0; offset < end; offset += 4) {
        const amplitude = Math.abs(bytes.readFloatLE(offset));
        const bar = Math.min(BAR_COUNT - 1, Math.floor(sample++ / (duration * SAMPLE_RATE) * BAR_COUNT));
        if (!Number.isFinite(amplitude)) continue;
        squares[bar] += amplitude * amplitude;
        maxima[bar] = Math.max(maxima[bar], amplitude);
        counts[bar]++;
      }
      remainder = Buffer.from(bytes.subarray(end));
    },
    finish() {
      const peaks = Array.from(squares, (sum, index) =>
        (counts[index] ? Math.sqrt(sum / counts[index]) : 0) * 0.7 + maxima[index] * 0.3,
      );
      const max = Math.max(...peaks);
      return peaks.map((peak) => max > 0
        ? Number(Math.max(0.08, Math.pow(peak / max, 0.75)).toFixed(4))
        : 0.16);
    },
  };
}

async function generateWaveform(audioUrl: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kirtan-waveform-"));
  try {
    const response = await fetch(audioUrl, { cache: "no-store", signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) throw new Error("Could not download waveform source");
    const input = path.join(tempDir, "audio");
    // Stream compressed audio to disk instead of buffering it in the server heap.
    await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(input));
    const { stdout } = await promisify(execFile)(process.env.FFPROBE_PATH || "ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", input,
    ], { timeout: 30_000 });
    const duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("Audio duration unavailable");
    const accumulator = createWaveformAccumulator(duration);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
        "-v", "error", "-nostdin", "-i", input, "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE),
        "-f", "f32le", "pipe:1",
      ], { stdio: ["ignore", "pipe", "ignore"], timeout: 120_000 });
      child.stdout.on("data", (chunk: Buffer) => accumulator.write(chunk));
      child.on("error", reject);
      child.on("close", (code) => code === 0 ? resolve() : reject(new Error("Waveform decoding failed")));
    });
    return accumulator.finish();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function getAdminWaveform(audioUrl: string) {
  // Replacements, trims and normalization publish a new audio URL, invalidating the cache.
  const key = createHash("sha256").update(audioUrl).digest("hex");
  const file = path.join(cacheDir, `${key}.json`);
  try {
    const peaks = JSON.parse(await fs.readFile(file, "utf8"));
    if (Array.isArray(peaks) && peaks.length === BAR_COUNT && peaks.every((peak) => Number.isFinite(peak))) return peaks as number[];
  } catch { /* Cache miss: generate once, including across simultaneous requests. */ }
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 8) throw new Error("Waveform generator busy. Try again shortly.");
  const task = queue.then(async () => {
    const peaks = await generateWaveform(audioUrl);
    await fs.mkdir(cacheDir, { recursive: true });
    const temporary = `${file}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(peaks));
    await fs.rename(temporary, file);
    return peaks;
  });
  pending.set(key, task);
  queue = task.catch(() => {});
  try {
    return await task;
  } finally {
    pending.delete(key);
  }
}
