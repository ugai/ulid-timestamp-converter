import { describe, it, expect } from "vitest";
import {
  normalizeUlidInput,
  decodeUlid,
  parseUlidTimestamp,
  ULID_FULL_LENGTH,
  ULID_TIMESTAMP_LENGTH,
} from "./ulid";

describe("normalizeUlidInput", () => {
  it("uppercases and returns a full-length ULID unchanged", () => {
    const input = "01aryz6s41ykem8c80greak1hj";
    const result = normalizeUlidInput(input);
    expect(result).toBe(input.toUpperCase());
    expect(result.length).toBe(ULID_FULL_LENGTH);
  });

  it("pads a timestamp-only input to full ULID length", () => {
    const timestampOnly = "01ARYZ6S41";
    const result = normalizeUlidInput(timestampOnly);
    expect(result.length).toBe(ULID_FULL_LENGTH);
    expect(result).toBe("01ARYZ6S410000000000000000");
  });

  it("pads a partial ULID (between timestamp and full length)", () => {
    const partial = "01ARYZ6S41YKEM";
    const result = normalizeUlidInput(partial);
    expect(result.length).toBe(ULID_FULL_LENGTH);
    expect(result.startsWith(partial)).toBe(true);
  });
});

describe("decodeUlid", () => {
  it("decodes a known ULID to the correct epoch milliseconds", () => {
    // 01ARYZ6S41 encodes timestamp 1469918176385
    const result = decodeUlid("01ARYZ6S41YKEM8C80GREAK1HJ");
    expect(result.epochMs).toBe(1469918176385);
    expect(result.timestampPart).toBe("01ARYZ6S41");
    expect(result.randomnessPart).toBe("YKEM8C80GREAK1HJ");
  });

  it("decodes a timestamp-only input (pads randomness)", () => {
    const result = decodeUlid("01ARYZ6S41");
    expect(result.epochMs).toBe(1469918176385);
    expect(result.timestampPart).toBe("01ARYZ6S41");
    expect(result.randomnessPart).toBe("0000000000000000");
  });

  it("throws on invalid ULID input", () => {
    expect(() => decodeUlid("INVALID")).toThrow();
  });
});

describe("parseUlidTimestamp", () => {
  it("breaks down a known timestamp into correct base32/dec/bin/hex", () => {
    const result = parseUlidTimestamp("01ARYZ6S41");
    expect(result.base32Values).toEqual([
      "0", "1", "A", "R", "Y", "Z", "6", "S", "4", "1",
    ]);
    expect(result.decValues).toEqual([0, 1, 10, 24, 30, 31, 6, 25, 4, 1]);
    expect(result.binAll.length).toBe(48); // 48-bit timestamp
  });

  it("produces correct hex for a zero timestamp", () => {
    const result = parseUlidTimestamp("0000000000");
    expect(result.hexAll).toBe("000000000000");
    expect(result.decValues).toEqual(Array(10).fill(0));
  });

  it("produces correct hex for a max timestamp (7ZZZZZZZZZ)", () => {
    const result = parseUlidTimestamp("7ZZZZZZZZZ");
    expect(result.hexAll).toBe("FFFFFFFFFFFF");
  });
});
