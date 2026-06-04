import { createHmac } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function getDisplayIdSecret(): string {
  const secret = process.env.SIGN_DISPLAY_ID_SECRET;
  if (!secret) {
    throw new Error("SIGN_DISPLAY_ID_SECRET is not set");
  }
  return secret;
}

/** Stable, non-reversible display handle derived from auth uid + server secret. */
export function hashDisplayId(authUserId: string): string {
  const digest = createHmac("sha256", getDisplayIdSecret())
    .update(authUserId)
    .digest();
  return encodeBase32(digest);
}
