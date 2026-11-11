import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const UNPUBLISHED_PREVIEW_COOKIE = "kk_unpublished_preview";
export const UNPUBLISHED_PREVIEW_TTL_SECONDS = 30 * 24 * 60 * 60;

function previewSecret() {
  return process.env.UNPUBLISHED_PREVIEW_SECRET?.trim() || null;
}

export function isUnpublishedPreviewConfigured() {
  return previewSecret() !== null;
}

export function isValidUnpublishedPreviewPassphrase(value: unknown) {
  const secret = previewSecret();
  if (!secret || typeof value !== "string" || value.length > 512) return false;
  const expected = createHash("sha256").update(secret).digest();
  const actual = createHash("sha256").update(value).digest();
  return timingSafeEqual(expected, actual);
}

function signExpiry(expiry: string, secret: string) {
  return createHmac("sha256", secret).update(expiry).digest("hex");
}

export function createUnpublishedPreviewToken(now = Date.now()) {
  const secret = previewSecret();
  if (!secret) return null;
  const expiry = String(Math.floor(now / 1000) + UNPUBLISHED_PREVIEW_TTL_SECONDS);
  return `${expiry}.${signExpiry(expiry, secret)}`;
}

export async function hasUnpublishedPreviewAccess(now = Date.now()) {
  const secret = previewSecret();
  if (!secret) return false;
  const token = (await cookies()).get(UNPUBLISHED_PREVIEW_COOKIE)?.value;
  const [expiry, signature, extra] = token?.split(".") ?? [];
  if (!expiry || !signature || extra || !/^\d+$/.test(expiry) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Number(expiry) <= Math.floor(now / 1000)) return false;
  const expected = Buffer.from(signExpiry(expiry, secret), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
