export const UUID7_TIMESTAMP_HEX_LENGTH = 12; // 48 bits = 12 nibbles
export const UUID7_FULL_LENGTH = 36; // standard format with dashes

export interface Uuid7DecodedResult {
  epochMs: number;
  timestampHex: string; // first 12 chars
  versionNibble: string; // "7"
  randA: string; // 3 chars
  variantNibble: string; // 1 char ([89ab])
  randB: string; // 15 chars
  formatted: string; // with dashes
}

export interface Uuid7EncodingBreakdown {
  hexNibbles: string[]; // 12 nibble chars
  decValues: number[]; // each nibble's decimal (0-15)
  binValues: string[]; // each nibble's 4-bit binary
  binAll: string; // 48-bit concatenated
  hexAll: string; // timestamp hex (= timestampHex)
}

/**
 * Remove dashes and uppercase a UUID input string.
 * Throws if the result is not 32 hex characters.
 */
export function normalizeUuid7Input(input: string): string {
  const v = input.replace(/-/g, "").toUpperCase();
  if (v.length !== 32) {
    throw new Error(
      `Invalid UUID length: expected 32 hex characters (with or without dashes), got ${v.length}`
    );
  }
  return v;
}

const UUID7_REGEX = /^[0-9A-F]{8}[0-9A-F]{4}7[0-9A-F]{3}[89AB][0-9A-F]{15}$/i;

/**
 * Decode a UUID v7 string into its component parts and epoch-millisecond timestamp.
 * Throws if the input is not a valid UUID v7.
 */
export function decodeUuid7(input: string): Uuid7DecodedResult {
  const v = normalizeUuid7Input(input);
  if (!UUID7_REGEX.test(v)) {
    throw new Error(
      "Invalid UUID v7: version nibble must be 7 and variant nibble must be [89AB]"
    );
  }

  const timestampHex = v.slice(0, 12);
  const versionNibble = v[12];
  const randA = v.slice(13, 16);
  const variantNibble = v[16];
  const randB = v.slice(17, 32);

  const epochMs = parseInt(timestampHex, 16);
  const formatted = `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}`;

  return { epochMs, timestampHex, versionNibble, randA, variantNibble, randB, formatted };
}

/**
 * Generate a UUID v7 string from an epoch-millisecond timestamp.
 * Uses crypto.getRandomValues for the random portion.
 */
export function generateUuid7(epochMs: number): string {
  const tsHex = epochMs.toString(16).padStart(12, "0");

  const randBytes = new Uint8Array(10);
  crypto.getRandomValues(randBytes);

  // rand_a: 12 bits (3 nibbles) from bytes 0-1
  const randAVal = ((randBytes[0] << 4) | (randBytes[1] >> 4)) & 0xfff;
  const randAHex = randAVal.toString(16).padStart(3, "0");

  // variant nibble: top 2 bits forced to 10 (RFC 4122), bottom 2 bits random
  const variantNibble = (0x8 | (randBytes[1] & 0x3)).toString(16);

  // rand_b: 60 bits (15 nibbles) from bytes 2-9 (8 bytes = 16 nibbles, take first 15)
  const randBHex = Array.from(randBytes.slice(2))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 15);

  return (
    `${tsHex.slice(0, 8)}-${tsHex.slice(8, 12)}` +
    `-7${randAHex}` +
    `-${variantNibble}${randBHex.slice(0, 3)}` +
    `-${randBHex.slice(3)}`
  );
}

/**
 * Break a UUID v7 timestamp hex (12 nibbles) into its
 * decimal, binary, and hexadecimal representations.
 */
export function parseUuid7Timestamp(timestampHex: string): Uuid7EncodingBreakdown {
  const upper = timestampHex.toUpperCase();
  const hexNibbles = upper.split("");
  const decValues = hexNibbles.map((c) => parseInt(c, 16));
  const binValues = decValues.map((d) => d.toString(2).padStart(4, "0"));
  const binAll = binValues.join("");
  const hexAll = upper;

  return { hexNibbles, decValues, binValues, binAll, hexAll };
}
