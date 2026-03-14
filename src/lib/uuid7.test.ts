import { describe, it, expect } from "vitest";
import {
  normalizeUuid7Input,
  decodeUuid7,
  generateUuid7,
  parseUuid7Timestamp,
  UUID7_FULL_LENGTH,
} from "./uuid7";

// Known UUID v7: epochMs = 1469918176385 (0x01563DF36481)
const KNOWN_UUID7 = "01563df3-6481-7abc-8def-000000000000";
const KNOWN_EPOCH_MS = 1469918176385;

describe("normalizeUuid7Input", () => {
  it("removes dashes and uppercases a standard UUID", () => {
    const result = normalizeUuid7Input(KNOWN_UUID7);
    expect(result).toBe("01563DF364817ABC8DEF000000000000");
    expect(result.length).toBe(32);
  });

  it("accepts a 32-char hex string without dashes", () => {
    const result = normalizeUuid7Input("01563df364817abc8def000000000000");
    expect(result).toBe("01563DF364817ABC8DEF000000000000");
  });

  it("throws on invalid length (too short)", () => {
    expect(() => normalizeUuid7Input("01563df3-6481")).toThrow();
  });

  it("throws on invalid length (too long)", () => {
    expect(() => normalizeUuid7Input("01563df3-6481-7abc-8def-000000000000-extra")).toThrow();
  });
});

describe("decodeUuid7", () => {
  it("decodes a known UUID v7 to the correct epoch milliseconds", () => {
    const result = decodeUuid7(KNOWN_UUID7);
    expect(result.epochMs).toBe(KNOWN_EPOCH_MS);
    expect(result.timestampHex).toBe("01563DF36481");
    expect(result.versionNibble).toBe("7");
    expect(result.randA).toBe("ABC");
    expect(result.variantNibble).toBe("8");
    expect(result.randB).toBe("DEF000000000000");
    expect(result.formatted).toBe(KNOWN_UUID7.toUpperCase());
  });

  it("accepts input without dashes", () => {
    const result = decodeUuid7("01563df364817abc8def000000000000");
    expect(result.epochMs).toBe(KNOWN_EPOCH_MS);
  });

  it("decodes zero UUID v7", () => {
    const result = decodeUuid7("00000000-0000-7000-8000-000000000000");
    expect(result.epochMs).toBe(0);
    expect(result.timestampHex).toBe("000000000000");
  });

  it("throws on version mismatch (not v7)", () => {
    // UUID v4 style
    expect(() => decodeUuid7("550e8400-e29b-41d4-a716-446655440000")).toThrow();
  });

  it("throws on invalid variant nibble", () => {
    // variant nibble is 'C' which is not [89AB]
    expect(() => decodeUuid7("01563df3-6481-7abc-cdef-000000000000")).toThrow();
  });

  it("throws on invalid input", () => {
    expect(() => decodeUuid7("INVALID")).toThrow();
  });
});

describe("generateUuid7", () => {
  const UUID7_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("returns a string matching UUID v7 format", () => {
    const result = generateUuid7(Date.now());
    expect(result.length).toBe(UUID7_FULL_LENGTH);
    expect(UUID7_FORMAT.test(result)).toBe(true);
  });

  it("encodes epochMs that can be decoded back", () => {
    const epochMs = KNOWN_EPOCH_MS;
    const uuid7 = generateUuid7(epochMs);
    const decoded = decodeUuid7(uuid7);
    expect(decoded.epochMs).toBe(epochMs);
  });

  it("sets variant bits correctly ([89ab])", () => {
    for (let i = 0; i < 20; i++) {
      const uuid7 = generateUuid7(Date.now());
      const variantNibble = uuid7.replace(/-/g, "")[16].toLowerCase();
      expect(["8", "9", "a", "b"]).toContain(variantNibble);
    }
  });

  it("generates different values on successive calls", () => {
    const a = generateUuid7(Date.now());
    const b = generateUuid7(Date.now());
    // Extremely unlikely to be identical due to random portion
    expect(a).not.toBe(b);
  });

  it("works for epochMs = 0", () => {
    const uuid7 = generateUuid7(0);
    expect(uuid7.startsWith("00000000-0000-7")).toBe(true);
    const decoded = decodeUuid7(uuid7);
    expect(decoded.epochMs).toBe(0);
  });

  it("works for max valid epochMs (2^48 - 1)", () => {
    const maxEpochMs = 0xffffffffffff;
    const uuid7 = generateUuid7(maxEpochMs);
    const decoded = decodeUuid7(uuid7);
    expect(decoded.epochMs).toBe(maxEpochMs);
  });

  it("throws for negative epochMs", () => {
    expect(() => generateUuid7(-1)).toThrow();
  });

  it("throws for epochMs exceeding 48-bit max", () => {
    expect(() => generateUuid7(0x1000000000000)).toThrow();
  });

  it("throws for NaN", () => {
    expect(() => generateUuid7(NaN)).toThrow();
  });

  it("throws for Infinity", () => {
    expect(() => generateUuid7(Infinity)).toThrow();
  });

  it("throws for non-integer epochMs", () => {
    expect(() => generateUuid7(1.5)).toThrow();
  });
});

describe("parseUuid7Timestamp", () => {
  it("breaks down a known timestamp into correct nibble/dec/bin/hex", () => {
    // timestampHex for epochMs = 1469918176385 is "01563DF36481"
    const result = parseUuid7Timestamp("01563DF36481");
    expect(result.hexNibbles).toEqual(["0", "1", "5", "6", "3", "D", "F", "3", "6", "4", "8", "1"]);
    expect(result.decValues).toEqual([0, 1, 5, 6, 3, 13, 15, 3, 6, 4, 8, 1]);
    expect(result.binAll.length).toBe(48);
    expect(result.hexAll).toBe("01563DF36481");
  });

  it("produces all zeros for zero timestamp", () => {
    const result = parseUuid7Timestamp("000000000000");
    expect(result.hexNibbles).toEqual(Array(12).fill("0"));
    expect(result.decValues).toEqual(Array(12).fill(0));
    expect(result.binAll).toBe("0".repeat(48));
    expect(result.hexAll).toBe("000000000000");
  });

  it("produces all max values for FFFFFFFFFFFF", () => {
    const result = parseUuid7Timestamp("FFFFFFFFFFFF");
    expect(result.hexNibbles).toEqual(Array(12).fill("F"));
    expect(result.decValues).toEqual(Array(12).fill(15));
    expect(result.binAll).toBe("1".repeat(48));
    expect(result.hexAll).toBe("FFFFFFFFFFFF");
  });

  it("accepts lowercase input and normalizes to uppercase", () => {
    const result = parseUuid7Timestamp("abcdef012345");
    expect(result.hexAll).toBe("ABCDEF012345");
    expect(result.hexNibbles).toEqual(["A", "B", "C", "D", "E", "F", "0", "1", "2", "3", "4", "5"]);
  });
});
