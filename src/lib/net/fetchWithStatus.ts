"use client";

import { markOffline, recordRequestFailure, recordRequestSuccess } from "./offlineStore";

type FetchWithStatusInit = RequestInit & { timeoutMs?: number };

export async function fetchWithStatus(
  input: RequestInfo | URL,
  init?: FetchWithStatusInit,
) {
  const { timeoutMs = 15000, ...options } = init ?? {};
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);
  }

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true },
      );
    }
  }

  try {
    const response = await fetch(input, { ...options, signal: controller.signal });
    if (response.ok) {
      recordRequestSuccess();
    }
    return response;
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    if (!isAbort || didTimeout) {
      recordRequestFailure();
      if (didTimeout || (typeof navigator !== "undefined" && !navigator.onLine)) {
        markOffline();
      }
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
