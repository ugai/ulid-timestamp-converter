import { decodeTime } from "ulidx";

export const ULID_FULL_LENGTH = 26;
export const ULID_TIMESTAMP_LENGTH = 10;
export const CROCKFORD_BASE32_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const HEX_CHARS = "0123456789ABCDEF";

export interface EncodingBreakdown {
  base32Values: string[];
  decValues: number[];
  binValues: string[];
  binAll: string;
  hexAll: string;
}

/**
 * Normalize a ULID input string: uppercase and pad the randomness part if only
 * the timestamp portion (or a partial ULID) is provided.
 * Returns the normalized ULID string (always 26 characters when valid).
 */
export function normalizeUlidInput(input: string): string {
  let v = input.toUpperCase();
  if (v.length >= ULID_TIMESTAMP_LENGTH && v.length < ULID_FULL_LENGTH) {
    v += "0".repeat(ULID_FULL_LENGTH - v.length);
  }
  return v;
}

/**
 * Decode a ULID string into its epoch-millisecond timestamp,
 * timestamp part, and randomness part.
 * Throws if the input is not a valid ULID.
 */
export function decodeUlid(input: string): {
  epochMs: number;
  timestampPart: string;
  randomnessPart: string;
} {
  const v = normalizeUlidInput(input);
  const epochMs = decodeTime(v);
  const timestampPart = v.slice(0, ULID_TIMESTAMP_LENGTH);
  const randomnessPart = v.slice(ULID_TIMESTAMP_LENGTH);
  return { epochMs, timestampPart, randomnessPart };
}

/**
 * Break a ULID timestamp part (10 Crockford-Base32 characters) into its
 * base-32, decimal, binary, and hexadecimal representations.
 */
export function parseUlidTimestamp(ulidTimestamp: string): EncodingBreakdown {
  const base32Values = ulidTimestamp.split("");
  const decValues: number[] = [];
  const binValues: string[] = [];

  // base32 -> decimal, binary
  for (const base32Char of base32Values) {
    const dec = CROCKFORD_BASE32_CHARS.indexOf(base32Char);
    decValues.push(dec);
    binValues.push(dec.toString(2).padStart(5, "0"));
  }
  binValues[0] = binValues[0].slice(2);
  const binAll = binValues.join("");

  // binary -> hexadecimal
  let hexAll = "";
  let total = 0;
  for (const [i, binChar] of binAll.split("").reverse().entries()) {
    const pos = i % 4;
    if (pos === 0) {
      total = 0;
    }
    if (binChar === "1") {
      total += 1 << pos;
    }
    if (pos === 3) {
      hexAll = HEX_CHARS[total] + hexAll;
    }
  }

  return { base32Values, decValues, binValues, binAll, hexAll };
}
