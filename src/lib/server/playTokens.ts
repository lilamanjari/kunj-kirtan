import { createHmac, timingSafeEqual } from "node:crypto";

type PlayTokenPayload = {
  kirtanId: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.PLAYBACK_TOKEN_SECRET;
  if (!secret) {
    throw new Error("Missing PLAYBACK_TOKEN_SECRET");
  }
  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createPlayToken(kirtanId: string, ttlSeconds = 60 * 30) {
  const payload: PlayTokenPayload = {
    kirtanId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPlayToken(token: string, expectedKirtanId: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false, error: "Invalid token" as const };
  }

  const expectedSignature = sign(encodedPayload);
  if (signature.length !== expectedSignature.length) {
    return { ok: false, error: "Invalid token" as const };
  }
  const isMatch = timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );

  if (!isMatch) {
    return { ok: false, error: "Invalid token" as const };
  }

  let payload: PlayTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as PlayTokenPayload;
  } catch {
    return { ok: false, error: "Invalid token" as const };
  }

  if (payload.kirtanId !== expectedKirtanId) {
    return { ok: false, error: "Token/kirtan mismatch" as const };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Token expired" as const };
  }

  return { ok: true as const };
}
