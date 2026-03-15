<script lang="ts">
  import { onMount } from "svelte";
  import { ulid, encodeTime } from "ulidx";
  import {
    ULID_TIMESTAMP_LENGTH,
    decodeUlid,
    parseUlidTimestamp,
  } from "./lib/ulid";
  import {
    UUID7_TIMESTAMP_HEX_LENGTH,
    decodeUuid7,
    parseUuid7Timestamp,
    generateUuid7,
  } from "./lib/uuid7";
  import type { Uuid7DecodedResult } from "./lib/uuid7";

  const siteTitle = "ULID / UUID v7 Timestamp Converter";
  const repositoryUrl = "https://github.com/ugai/ulid-timestamp-converter/";

  // dynamic theming {{{
  let dark = $state(false);

  $effect(() => {
    document.body.toggleAttribute("dark-theme", dark);
  });
  // }}} dynamic theming

  // https://tc39.es/ecma402/#table-datetimeformat-components
  const defaultDateTimeFormat = new Intl.DateTimeFormat([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    fractionalSecondDigits: 3,
    timeZoneName: "short",
    hour12: false,
  });

  let lastInput: "ulid" | "uuid7" | "datetime" = $state("ulid");

  // Clipboard helper with brief "Copied!" feedback
  let lastCopied = $state("");
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    lastCopied = key;
    setTimeout(() => {
      if (lastCopied === key) lastCopied = "";
    }, 1500);
  };

  abstract class InputFieldBase {
    value: string = $state("");
    errorMessage: string = $state("");

    clear() {
      this.value = "";
      this.errorMessage = "";
    }
  }

  class UlidInputField extends InputFieldBase {
    set_random_value() {
      this.value = ulid();
    }
  }

  class Uuid7InputField extends InputFieldBase {
    set_random_value() {
      this.value = generateUuid7(Date.now());
    }
  }

  class DateTimeInputField extends InputFieldBase {
    set_current_date() {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      this.value = now.toISOString().slice(0, -1);
    }
  }

  // Shared timestamp fields displayed once in the Timestamp section
  class SharedTimestamp {
    epochInMs: string = $state("");
    dateLocalDefault: string = $state("");
    dateLocalNumeric: string = $state("");
    dateUtcISO: string = $state("");

    clear() {
      this.epochInMs = "";
      this.dateLocalDefault = "";
      this.dateLocalNumeric = "";
      this.dateUtcISO = "";
    }

    update(epochMs: number) {
      const dt = new Date(epochMs);
      this.epochInMs = epochMs.toString();
      this.dateLocalDefault = dt.toString();
      this.dateLocalNumeric = defaultDateTimeFormat.format(dt);
      this.dateUtcISO = dt.toISOString();
    }
  }

  class OutputFields {
    ulidTimestampPart: string = $state("");
    ulidRandomnessPart: string = $state("");

    base32Values: string[] = $state([]);
    decValues: number[] = $state([]);
    binValues: string[] = $state([]);
    binAll: string = $state("");
    hexAll: string = $state("");

    clear() {
      this.ulidTimestampPart = "";
      this.ulidRandomnessPart = "";

      this.base32Values = [];
      this.decValues = [];
      this.binValues = [];
      this.binAll = "";
      this.hexAll = "";
    }

    update(ulidTimestamp: string, ulidRandomness: string) {
      this.ulidTimestampPart = ulidTimestamp;
      this.ulidRandomnessPart = ulidRandomness;
      this._updateEncodingOutputs(ulidTimestamp);
    }

    private _updateEncodingOutputs(ulidTimestamp: string) {
      const result = parseUlidTimestamp(ulidTimestamp);
      this.base32Values = result.base32Values;
      this.decValues = result.decValues;
      this.binValues = result.binValues;
      this.binAll = result.binAll;
      this.hexAll = result.hexAll;
    }
  }

  class Uuid7OutputFields {
    uuid7Formatted: string = $state("");
    timestampHex: string = $state("");
    randA: string = $state("");
    variantNibble: string = $state("");
    randB: string = $state("");

    hexNibbles: string[] = $state([]);
    decValues: number[] = $state([]);
    binValues: string[] = $state([]);
    binAll: string = $state("");
    hexAll: string = $state("");

    clear() {
      this.uuid7Formatted = "";
      this.timestampHex = "";
      this.randA = "";
      this.variantNibble = "";
      this.randB = "";

      this.hexNibbles = [];
      this.decValues = [];
      this.binValues = [];
      this.binAll = "";
      this.hexAll = "";
    }

    update(decoded: Uuid7DecodedResult) {
      this.uuid7Formatted = decoded.formatted;
      this.timestampHex = decoded.timestampHex;
      this.randA = decoded.randA;
      this.variantNibble = decoded.variantNibble;
      this.randB = decoded.randB;
      this._updateEncodingOutputs(decoded.timestampHex);
    }

    private _updateEncodingOutputs(timestampHex: string) {
      const result = parseUuid7Timestamp(timestampHex);
      this.hexNibbles = result.hexNibbles;
      this.decValues = result.decValues;
      this.binValues = result.binValues;
      this.binAll = result.binAll;
      this.hexAll = result.hexAll;
    }
  }

  const inputUlid = new UlidInputField();
  const inputUuid7 = new Uuid7InputField();
  const inputDateTime = new DateTimeInputField();
  const sharedTimestamp = new SharedTimestamp();
  const outputs = new OutputFields();
  const outputsUuid7 = new Uuid7OutputFields();
  let success = $state(false);
  let successUuid7 = $state(false);
  let timestampSuccess = $derived(success || successUuid7);

  // Cross-conversion: derive both outputs from whichever input was last changed
  $effect(() => {
    if (lastInput === "ulid") {
      convertUlidInput(inputUlid.value);
    } else if (lastInput === "uuid7") {
      convertUuid7Input(inputUuid7.value);
    } else {
      convertDateTimeInput(inputDateTime.value);
    }
  });

  /** Deterministically derive the ULID randomness part from an epochMs value. */
  const deriveUlidRandomnessFromEpoch = (epochMs: number): string => {
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const randomnessLength = 26 - ULID_TIMESTAMP_LENGTH;
    let state = epochMs >>> 0;
    let result = "";

    for (let i = 0; i < randomnessLength; i += 1) {
      // Simple deterministic LCG to spread bits from epochMs
      state = (state * 1664525 + 1013904223) >>> 0;
      result += alphabet[state % 32];
    }

    return result;
  };

  /** Update ULID output from epochMs. Returns error message on failure. */
  const updateUlidFromEpoch = (epochMs: number): string | null => {
    try {
      const tsPart = encodeTime(epochMs, ULID_TIMESTAMP_LENGTH);
      const rsPart = deriveUlidRandomnessFromEpoch(epochMs);
      outputs.update(tsPart, rsPart);
      success = true;
      return null;
    } catch (e: unknown) {
      outputs.clear();
      success = false;
      return e instanceof Error ? e.message : "ULID conversion failed";
    }
  };

  /** Update UUID v7 output from epochMs. Returns error message on failure. */
  const updateUuid7FromEpoch = (epochMs: number): string | null => {
    try {
      const uuid7 = generateUuid7(epochMs);
      outputsUuid7.update(decodeUuid7(uuid7));
      successUuid7 = true;
      return null;
    } catch (e: unknown) {
      outputsUuid7.clear();
      successUuid7 = false;
      return e instanceof Error ? e.message : "UUID v7 conversion failed";
    }
  };

  const clearAll = () => {
    sharedTimestamp.clear();
    outputs.clear();
    outputsUuid7.clear();
    success = false;
    successUuid7 = false;
  };

  const convertUlidInput = (v: string) => {
    if (!v) {
      inputUlid.errorMessage = "";
      clearAll();
      return;
    }

    try {
      const { epochMs, timestampPart, randomnessPart } = decodeUlid(v);
      sharedTimestamp.update(epochMs);
      outputs.update(timestampPart, randomnessPart);
      inputUlid.errorMessage = "";
      success = true;

      // Generate UUID v7 output; any failure should not be treated as a ULID input error.
      updateUuid7FromEpoch(epochMs);
    } catch (e: unknown) {
      clearAll();
      if (e instanceof Error) inputUlid.errorMessage = e.message;
    }
  };

  const convertUuid7Input = (v: string) => {
    if (!v) {
      inputUuid7.errorMessage = "";
      clearAll();
      return;
    }

    try {
      const decoded = decodeUuid7(v);
      sharedTimestamp.update(decoded.epochMs);
      outputsUuid7.update(decoded);
      inputUuid7.errorMessage = "";
      successUuid7 = true;

      // Generate ULID output; any failure should not be treated as a UUID v7 input error.
      updateUlidFromEpoch(decoded.epochMs);
    } catch (e: unknown) {
      clearAll();
      if (e instanceof Error) inputUuid7.errorMessage = e.message;
    }
  };

  const convertDateTimeInput = (v: string) => {
    if (!v) {
      inputDateTime.errorMessage = "";
      clearAll();
      return;
    }

    const epochMs = new Date(v).getTime();
    if (!Number.isFinite(epochMs)) {
      inputDateTime.errorMessage = "Invalid date";
      clearAll();
      return;
    }
    inputDateTime.errorMessage = "";

    sharedTimestamp.update(epochMs);
    const errors: string[] = [];
    const ulidErr = updateUlidFromEpoch(epochMs);
    if (ulidErr) errors.push(ulidErr);
    const uuid7Err = updateUuid7FromEpoch(epochMs);
    if (uuid7Err) errors.push(uuid7Err);
    if (errors.length) inputDateTime.errorMessage = errors.join("; ");
  };

  onMount(() => {
    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    inputUlid.set_random_value();
  });
</script>

<main>
  <h1 class="title">{siteTitle}</h1>

  <h2>Input</h2>
  <div class="group">
    <div class="input-row" class:input-row-active={lastInput === "ulid"}>
      <label for="ulid-input">ULID</label>
      {#if inputUlid.value && lastInput === "ulid" && success}
        <span class="badge badge-valid" role="status">&#x2713; Valid</span>
      {/if}
      <div class="input-controls">
        <input
          id="ulid-input"
          class="mono"
          class:input-error={!!inputUlid.errorMessage}
          type="text"
          placeholder="Enter ULID here"
          bind:value={inputUlid.value}
          oninput={() => lastInput = "ulid"}
        />
        <button
          class="button"
          onclick={() => { inputUlid.clear(); lastInput = "ulid"; }}
          disabled={!inputUlid.value}>Clear</button
        >
        <button class="button" onclick={() => { inputUlid.set_random_value(); lastInput = "ulid"; }}
          >New</button
        >
      </div>
      {#if inputUlid.errorMessage}
        <span class="error-message" aria-live="polite">
          {inputUlid.errorMessage}
        </span>
      {/if}
    </div>
    <div class="input-row" class:input-row-active={lastInput === "uuid7"}>
      <label for="uuid7-input">UUID v7</label>
      {#if inputUuid7.value && lastInput === "uuid7" && successUuid7}
        <span class="badge badge-valid" role="status">&#x2713; Valid</span>
      {/if}
      <div class="input-controls">
        <input
          id="uuid7-input"
          class="mono"
          class:input-error={!!inputUuid7.errorMessage}
          type="text"
          placeholder="Enter UUID v7 here"
          bind:value={inputUuid7.value}
          oninput={() => lastInput = "uuid7"}
        />
        <button
          class="button"
          onclick={() => { inputUuid7.clear(); lastInput = "uuid7"; }}
          disabled={!inputUuid7.value}>Clear</button
        >
        <button class="button" onclick={() => { inputUuid7.set_random_value(); lastInput = "uuid7"; }}
          >New</button
        >
      </div>
      {#if inputUuid7.errorMessage}
        <span class="error-message" aria-live="polite">
          {inputUuid7.errorMessage}
        </span>
      {/if}
    </div>
    <div class="input-row" class:input-row-active={lastInput === "datetime"}>
      <label for="datetime-input">Date</label>
      {#if inputDateTime.value && lastInput === "datetime" && timestampSuccess}
        <span class="badge badge-valid" role="status">&#x2713; Valid</span>
      {/if}
      <div class="input-controls">
        <input
          id="datetime-input"
          class:input-error={!!inputDateTime.errorMessage}
          type="datetime-local"
          step="0.001"
          bind:value={inputDateTime.value}
          oninput={() => lastInput = "datetime"}
        />
        <button
          class="button"
          onclick={() => { inputDateTime.clear(); lastInput = "datetime"; }}
          disabled={!inputDateTime.value}>Clear</button
        >
        <button class="button" onclick={() => { inputDateTime.set_current_date(); lastInput = "datetime"; }}
          >Now</button
        >
      </div>
      {#if inputDateTime.errorMessage}
        <span class="error-message" aria-live="polite">
          {inputDateTime.errorMessage}
        </span>
      {/if}
      <span class="input-note">Millisecond precision depends on browser support</span>
    </div>
  </div>

  <details open>
    <summary><span class="summary-heading">Timestamp</span></summary>
    <div class="group output-section" class:output-active={timestampSuccess}>
      <dl class="margin-top-0">
        <dt>Unix Timestamp <span class="smaller">(in milliseconds)</span></dt>
        <dd class="mono dd-copyable">
          {sharedTimestamp.epochInMs}
          {#if sharedTimestamp.epochInMs}
            <button class="copy-btn" onclick={() => copyToClipboard(sharedTimestamp.epochInMs, "epoch")} aria-label="Copy value">
              {lastCopied === "epoch" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt>Date <span class="smaller">(Local, default format)</span></dt>
        <dd class="mono dd-copyable">
          {sharedTimestamp.dateLocalDefault}
          {#if sharedTimestamp.dateLocalDefault}
            <button class="copy-btn" onclick={() => copyToClipboard(sharedTimestamp.dateLocalDefault, "dateDefault")} aria-label="Copy value">
              {lastCopied === "dateDefault" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt>Date <span class="smaller">(Local, numeric format)</span></dt>
        <dd class="mono dd-copyable">
          {sharedTimestamp.dateLocalNumeric}
          {#if sharedTimestamp.dateLocalNumeric}
            <button class="copy-btn" onclick={() => copyToClipboard(sharedTimestamp.dateLocalNumeric, "dateNumeric")} aria-label="Copy value">
              {lastCopied === "dateNumeric" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt>Date <span class="smaller">(UTC, ISO-8601)</span></dt>
        <dd class="mono dd-copyable">
          {sharedTimestamp.dateUtcISO}
          {#if sharedTimestamp.dateUtcISO}
            <button class="copy-btn" onclick={() => copyToClipboard(sharedTimestamp.dateUtcISO, "dateISO")} aria-label="Copy value">
              {lastCopied === "dateISO" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
      </dl>
    </div>
  </details>

  <details open>
    <summary><span class="summary-heading">ULID Output</span></summary>
    <div class="group output-section" class:output-active={success}>
      <dl class="margin-top-0">
        <dt>ULID</dt>
        <dd class="mono dd-copyable">
          <span class="ulid-part-timestamp">{outputs.ulidTimestampPart}</span
          ><span class="ulid-part-random">{outputs.ulidRandomnessPart}</span>
          {#if outputs.ulidTimestampPart}
            <button class="copy-btn" onclick={() => copyToClipboard(outputs.ulidTimestampPart + outputs.ulidRandomnessPart, "ulid")} aria-label="Copy value">
              {lastCopied === "ulid" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt>ULID Timestamp</dt>
        <dd class="mono ulid-part-timestamp dd-copyable">
          {outputs.ulidTimestampPart}
          {#if outputs.ulidTimestampPart}
            <button class="copy-btn" onclick={() => copyToClipboard(outputs.ulidTimestampPart, "ulidTs")} aria-label="Copy value">
              {lastCopied === "ulidTs" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
      </dl>

      {#if success}
        <div class="table-wrapper">
          <table>
            <caption>ULID timestamp encoding breakdown</caption>
            <thead class="text-center">
              <tr>
                <th class="no-border"></th>
                <th colspan={ULID_TIMESTAMP_LENGTH}>Timestamp (48-bit)</th>
              </tr>
            </thead>
            <tbody class="mono">
              <tr>
                <th>
                  Base 32
                  <a
                    target="_blank"
                    href="http://www.crockford.com/base32.html"
                    rel="noreferrer">?</a
                  >
                </th>
                {#each outputs.base32Values as base32Char}
                  <td class="text-right ulid-part-timestamp">{base32Char}</td>
                {/each}
              </tr>
              <tr>
                <th>Decimal</th>
                {#each outputs.decValues as dec}
                  <td class="text-right">{dec}</td>
                {/each}
              </tr>
              <tr>
                <th rowspan="2">Binary</th>
                {#each outputs.binValues as bin}
                  <td class="text-right small">{bin}</td>
                {/each}
              </tr>
              <tr>
                <td class="text-center small" colspan={ULID_TIMESTAMP_LENGTH}
                  >{outputs.binAll}</td
                >
              </tr>
              <tr>
                <th>Hexadecimal</th>
                <td class="text-center small" colspan={ULID_TIMESTAMP_LENGTH}
                  >{outputs.hexAll}</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </details>

  <details open>
    <summary><span class="summary-heading">UUID v7 Output</span></summary>
    <div class="group output-section" class:output-active={successUuid7}>
      <dl class="margin-top-0">
        <dt>UUID v7</dt>
        <dd class="mono dd-copyable">
          <span class="uuid7-part-timestamp">{outputsUuid7.timestampHex.slice(0, 8)}{outputsUuid7.timestampHex.length > 8 ? "-" : ""}{outputsUuid7.timestampHex.slice(8, 12)}</span
          >{#if outputsUuid7.uuid7Formatted}-7{outputsUuid7.randA}-{outputsUuid7.variantNibble}{outputsUuid7.randB.slice(0, 3)}-{outputsUuid7.randB.slice(3)}{/if}
          {#if outputsUuid7.uuid7Formatted}
            <button class="copy-btn" onclick={() => copyToClipboard(outputsUuid7.uuid7Formatted, "uuid7")} aria-label="Copy value">
              {lastCopied === "uuid7" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt>Timestamp Hex</dt>
        <dd class="mono uuid7-part-timestamp dd-copyable">
          {outputsUuid7.timestampHex}
          {#if outputsUuid7.timestampHex}
            <button class="copy-btn" onclick={() => copyToClipboard(outputsUuid7.timestampHex, "uuid7TsHex")} aria-label="Copy value">
              {lastCopied === "uuid7TsHex" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt title="12 random bits following the version nibble (RFC 9562 Section 5.7)">rand_a</dt>
        <dd class="mono dd-copyable">
          {outputsUuid7.randA}
          {#if outputsUuid7.randA}
            <button class="copy-btn" onclick={() => copyToClipboard(outputsUuid7.randA, "randA")} aria-label="Copy value">
              {lastCopied === "randA" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt title="2-bit variant field (10xx) indicating RFC 9562 layout (Section 4.1)">variant</dt>
        <dd class="mono dd-copyable">
          {outputsUuid7.variantNibble}
          {#if outputsUuid7.variantNibble}
            <button class="copy-btn" onclick={() => copyToClipboard(outputsUuid7.variantNibble, "variant")} aria-label="Copy value">
              {lastCopied === "variant" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
        <dt title="62 random bits for uniqueness within the same millisecond (RFC 9562 Section 5.7)">rand_b</dt>
        <dd class="mono dd-copyable">
          {outputsUuid7.randB}
          {#if outputsUuid7.randB}
            <button class="copy-btn" onclick={() => copyToClipboard(outputsUuid7.randB, "randB")} aria-label="Copy value">
              {lastCopied === "randB" ? "Copied!" : "Copy"}
            </button>
          {/if}
        </dd>
      </dl>

      {#if successUuid7}
        <div class="table-wrapper">
          <table>
            <caption>UUID v7 timestamp encoding breakdown</caption>
            <thead class="text-center">
              <tr>
                <th class="no-border"></th>
                <th colspan={UUID7_TIMESTAMP_HEX_LENGTH}>Timestamp (48-bit)</th>
              </tr>
            </thead>
            <tbody class="mono">
              <tr>
                <th>Hexadecimal</th>
                {#each outputsUuid7.hexNibbles as hex}
                  <td class="text-right uuid7-part-timestamp">{hex}</td>
                {/each}
              </tr>
              <tr>
                <th>Decimal</th>
                {#each outputsUuid7.decValues as dec}
                  <td class="text-right">{dec}</td>
                {/each}
              </tr>
              <tr>
                <th rowspan="2">Binary</th>
                {#each outputsUuid7.binValues as bin}
                  <td class="text-right small">{bin}</td>
                {/each}
              </tr>
              <tr>
                <td class="text-center small" colspan={UUID7_TIMESTAMP_HEX_LENGTH}
                  >{outputsUuid7.binAll}</td
                >
              </tr>
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </details>

  <div class="toolbar">
    <button class="button" onclick={() => dark = !dark} aria-label="Toggle theme">
      Light/Dark
    </button>
    <a
      class="button"
      target="_blank"
      rel="noreferrer"
      href={repositoryUrl}
      aria-label="GitHub"
    >
      GitHub
    </a>
  </div>
</main>

<style>
  .toolbar {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    align-items: center;
  }

  main {
    position: relative;
  }

  .summary-heading {
    font-size: 1.5em;
    font-weight: bold;
  }

  summary {
    cursor: pointer;
    margin-bottom: 4px;
  }

  details {
    margin-top: 16px;
  }

  .input-row {
    margin-bottom: 12px;
    padding: 8px;
    border-left: 3px solid transparent;
    border-radius: 4px;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }

  .input-row-active {
    border-left-color: var(--blue60);
    background-color: rgba(15, 98, 254, 0.04);
  }

  :global(body[dark-theme]) .input-row-active {
    border-left-color: var(--blue40);
    background-color: rgba(120, 169, 255, 0.06);
  }

  .input-row:last-child {
    margin-bottom: 0;
  }

  .input-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .input-controls input {
    flex: 1;
    min-width: 200px;
  }

  .input-note {
    display: block;
    font-size: 0.8em;
    margin-top: 4px;
    opacity: 0.6;
  }

  .output-section {
    transition: opacity 0.25s ease;
    opacity: 0.5;
  }

  .output-active {
    opacity: 1;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
  }

  caption {
    caption-side: top;
    text-align: left;
    font-size: 0.85em;
    opacity: 0.6;
    padding-bottom: 4px;
  }

  th,
  td {
    border: 1px solid var(--gray50);
    padding: 0.4em 0.6em;
    white-space: nowrap;
  }

  th.no-border {
    border: none;
    background-color: transparent;
  }

  label {
    font-weight: 600;
  }

  dl {
    display: grid;
    grid-template-columns: max-content auto;
    gap: 2px 12px;
  }

  dt span.smaller {
    font-size: smaller;
    font-weight: lighter;
    filter: invert(0.2);
  }

  dt {
    grid-column-start: 1;
    font-weight: normal;
  }

  dt[title] {
    text-decoration: underline dotted;
    cursor: help;
  }

  label::after,
  dt::after {
    content: ": ";
    font-weight: normal;
  }

  dd {
    grid-column-start: 2;
    transition: color 0.2s ease;
  }

  .dd-copyable {
    position: relative;
  }

  .copy-btn {
    all: unset;
    cursor: pointer;
    font-size: 0.7em;
    padding: 1px 6px;
    border-radius: 3px;
    margin-left: 8px;
    opacity: 0;
    background-color: var(--gray20);
    color: var(--gray70);
    transition: opacity 0.15s ease;
  }

  :global(body[dark-theme]) .copy-btn {
    background-color: var(--gray80);
    color: var(--gray30);
  }

  .dd-copyable:hover .copy-btn,
  .copy-btn:focus-visible {
    opacity: 1;
  }

  .copy-btn:hover {
    background-color: var(--gray30);
  }

  :global(body[dark-theme]) .copy-btn:hover {
    background-color: var(--gray70);
  }
</style>
