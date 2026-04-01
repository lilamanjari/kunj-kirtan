import { NextResponse } from "next/server";

type TimingEntry = {
  name: string;
  duration: number;
};

export class ServerTiming {
  private readonly startedAt = performance.now();
  private readonly entries: TimingEntry[] = [];

  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await fn();
    } finally {
      this.entries.push({
        name,
        duration: performance.now() - started,
      });
    }
  }

  withHeaders(init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    const total = performance.now() - this.startedAt;
    const value = [...this.entries, { name: "total", duration: total }]
      .map(({ name, duration }) => `${name};dur=${duration.toFixed(1)}`)
      .join(", ");

    headers.set("Server-Timing", value);

    return {
      ...init,
      headers,
    };
  }
}

export function jsonWithServerTiming(
  data: unknown,
  timing: ServerTiming,
  init?: ResponseInit,
) {
  return NextResponse.json(data, timing.withHeaders(init));
}
