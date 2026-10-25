import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { createWaveformAccumulator, getAdminWaveform } from "./adminWaveform";

describe("streamed waveform summaries", () => {
  it("handles split PCM samples and preserves the loud section's position", () => {
    const pcm = Buffer.alloc(8000 * 4);
    for (let sample = 4000; sample < 8000; sample++) pcm.writeFloatLE(0.5, sample * 4);
    const accumulator = createWaveformAccumulator(1);
    for (let offset = 0; offset < pcm.length; offset += 13) accumulator.write(pcm.subarray(offset, offset + 13));
    const peaks = accumulator.finish();
    expect(peaks).toHaveLength(1800);
    expect(peaks[100]).toBe(0.08);
    expect(peaks[1700]).toBe(1);
  });

  it("produces finite peaks for silence", () => {
    const accumulator = createWaveformAccumulator(1);
    accumulator.write(Buffer.alloc(32000));
    expect(accumulator.finish().every((peak) => peak === 0.16)).toBe(true);
  });
});

const hasFfmpeg = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"]).status === 0;
describe.skipIf(!hasFfmpeg)("FFmpeg waveform integration", () => {
  it("shares concurrent generation, caches results and regenerates for a replacement URL", async () => {
    const audio = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", [
      "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-f", "wav", "pipe:1",
    ]);
    expect(audio.status).toBe(0);
    const fetch = vi.fn(async () => new Response(audio.stdout));
    vi.stubGlobal("fetch", fetch);
    try {
      const url = `https://audio.test/${randomUUID()}.wav`;
      const [first, duplicate] = await Promise.all([getAdminWaveform(url), getAdminWaveform(url)]);
      expect(first).toHaveLength(1800);
      expect(first.every((peak) => peak >= 0.08 && peak <= 1)).toBe(true);
      expect(duplicate).toEqual(first);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(await getAdminWaveform(url)).toEqual(first);
      expect(fetch).toHaveBeenCalledTimes(1);
      await getAdminWaveform(`${url}?replacement=1`);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 20_000);
});
