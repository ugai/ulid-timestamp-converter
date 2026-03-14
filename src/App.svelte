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

  const siteTitle = "ULID Timestamp Converter";
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

  type AppMode = "ulid" | "uuid7";
  let mode: AppMode = $state("ulid");

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

  class OutputFields {
    ulidTimestampPart: string = $state("");
    ulidRandomnessPart: string = $state("");

    epochInMs: string = $state("");
    dateLocalDefault: string = $state("");
    dateLocalNumeric: string = $state("");
    dateUtcISO: string = $state("");

    base32Values: string[] = $state([]);
    decValues: number[] = $state([]);
    binValues: string[] = $state([]);
    binAll: string = $state("");
    hexAll: string = $state("");

    clear() {
      this.ulidTimestampPart = "";
      this.ulidRandomnessPart = "";

      this.epochInMs = "";
      this.dateLocalDefault = "";
      this.dateLocalNumeric = "";
      this.dateUtcISO = "";

      this.base32Values = [];
      this.decValues = [];
      this.binValues = [];
      this.binAll = "";
      this.hexAll = "";
    }

    update(ulidTimestamp: string, ulidRandomness: string, epochMs: number) {
      this.ulidTimestampPart = ulidTimestamp;
      this.ulidRandomnessPart = ulidRandomness;
      this._updateDateOutputs(epochMs);
      this._updateEncodingOutputs(ulidTimestamp);
    }

    private _updateDateOutputs(epochMs: number) {
      const dt = new Date(epochMs);
      this.epochInMs = epochMs.toString();
      this.dateLocalDefault = dt.toString();
      this.dateLocalNumeric = defaultDateTimeFormat.format(dt);
      this.dateUtcISO = dt.toISOString();
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

    epochInMs: string = $state("");
    dateLocalDefault: string = $state("");
    dateLocalNumeric: string = $state("");
    dateUtcISO: string = $state("");

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

      this.epochInMs = "";
      this.dateLocalDefault = "";
      this.dateLocalNumeric = "";
      this.dateUtcISO = "";

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
      this._updateDateOutputs(decoded.epochMs);
      this._updateEncodingOutputs(decoded.timestampHex);
    }

    private _updateDateOutputs(epochMs: number) {
      const dt = new Date(epochMs);
      this.epochInMs = epochMs.toString();
      this.dateLocalDefault = dt.toString();
      this.dateLocalNumeric = defaultDateTimeFormat.format(dt);
      this.dateUtcISO = dt.toISOString();
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
  const outputs = new OutputFields();
  const outputsUuid7 = new Uuid7OutputFields();
  let success = $state(false);
  let successUuid7 = $state(false);

  // Clear shared inputs and outputs on mode switch (must run before conversion effects)
  $effect(() => {
    const _ = mode;
    inputDateTime.clear();
    outputs.clear();
    outputsUuid7.clear();
  });

  $effect(() => {
    if (mode === "ulid") convertFromUlid(inputUlid.value);
  });
  $effect(() => {
    if (mode === "ulid") convertFromDateTime(inputDateTime.value);
  });
  $effect(() => {
    if (mode === "uuid7") convertFromUuid7(inputUuid7.value);
  });
  $effect(() => {
    if (mode === "uuid7") convertFromDateTimeForUuid7(inputDateTime.value);
  });

  const convertFromUlid = (v: string) => {
    if (!v) {
      outputs.clear();
      success = false;
      return;
    }

    try {
      const { epochMs, timestampPart, randomnessPart } = decodeUlid(v);
      outputs.update(timestampPart, randomnessPart, epochMs);

      inputUlid.errorMessage = "";
      success = true;
    } catch (e: unknown) {
      outputs.clear();
      if (e instanceof Error) inputUlid.errorMessage = e.message;
      success = false;
    }
  };

  const convertFromDateTime = (v: string) => {
    if (!v) {
      outputs.clear();
      success = false;
      return;
    }

    try {
      const epochMs = new Date(v).getTime();
      const tsPart = encodeTime(epochMs, ULID_TIMESTAMP_LENGTH);
      const rsPart = ulid().slice(ULID_TIMESTAMP_LENGTH);
      outputs.update(tsPart, rsPart, epochMs);

      inputDateTime.errorMessage = "";
      success = true;
    } catch (e: unknown) {
      outputs.clear();
      if (e instanceof Error) inputDateTime.errorMessage = e.message;
      success = false;
    }
  };

  const convertFromUuid7 = (v: string) => {
    if (!v) {
      outputsUuid7.clear();
      successUuid7 = false;
      return;
    }

    try {
      const decoded = decodeUuid7(v);
      outputsUuid7.update(decoded);

      inputUuid7.errorMessage = "";
      successUuid7 = true;
    } catch (e: unknown) {
      outputsUuid7.clear();
      if (e instanceof Error) inputUuid7.errorMessage = e.message;
      successUuid7 = false;
    }
  };

  const convertFromDateTimeForUuid7 = (v: string) => {
    if (!v) {
      outputsUuid7.clear();
      successUuid7 = false;
      return;
    }

    try {
      const epochMs = new Date(v).getTime();
      const uuid7 = generateUuid7(epochMs);
      const decoded = decodeUuid7(uuid7);
      outputsUuid7.update(decoded);

      inputDateTime.errorMessage = "";
      successUuid7 = true;
    } catch (e: unknown) {
      outputsUuid7.clear();
      if (e instanceof Error) inputDateTime.errorMessage = e.message;
      successUuid7 = false;
    }
  };

  onMount(() => {
    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    inputUlid.set_random_value();
  });
</script>

<main>
  <div class="theme-toggle">
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

  <h1 class="title">{siteTitle}</h1>

  <div class="mode-toggle">
    <button class="button" class:active={mode === "ulid"} onclick={() => mode = "ulid"}>ULID</button>
    <button class="button" class:active={mode === "uuid7"} onclick={() => mode = "uuid7"}>UUID v7</button>
  </div>

  {#if mode === "ulid"}
    <h2>Input</h2>
    <div class="group">
      <div>
        <label for="ulid-input">From ULID</label>
        <input
          id="ulid-input"
          class="mono"
          type="text"
          size="40"
          placeholder="Enter ULID here"
          bind:value={inputUlid.value}
        />
        {#if inputUlid.errorMessage}
          <span class="error-message" aria-live="polite">
            {inputUlid.errorMessage}
          </span>
        {/if}

        <button
          class="button"
          onclick={() => inputUlid.clear()}
          disabled={!inputUlid.value}>Clear</button
        >
        <button class="button" onclick={() => inputUlid.set_random_value()}
          >Generate</button
        >
      </div>
      <div>
        <label for="datetime-input">From Date</label>
        <input
          id="datetime-input"
          type="datetime-local"
          step="0.001"
          bind:value={inputDateTime.value}
        />
        {#if inputDateTime.errorMessage}
          <span class="error-message" aria-live="polite">
            {inputDateTime.errorMessage}
          </span>
        {/if}

        <button
          class="button"
          onclick={() => inputDateTime.clear()}
          disabled={!inputDateTime.value}>Clear</button
        >
        <button class="button" onclick={() => inputDateTime.set_current_date()}
          >Now</button
        >
      </div>
    </div>

    <h2>Output</h2>
    <div class="group">
      <dl class="margin-top-0">
        <dt>ULID</dt>
        <dd class="mono">
          <span class="ulid-part-timestamp">{outputs.ulidTimestampPart}</span
          ><span class="ulid-part-random">{outputs.ulidRandomnessPart}</span>
        </dd>
        <dt>ULID Timestamp</dt>
        <dd class="mono ulid-part-timestamp">{outputs.ulidTimestampPart}</dd>
        <dt>Unix Timestamp <span class="smaller">(in milliseconds)</span></dt>
        <dd class="mono">{outputs.epochInMs}</dd>
        <dt>Date <span class="smaller">(Local, default format)</span></dt>
        <dd class="mono">{outputs.dateLocalDefault}</dd>
        <dt>Date <span class="smaller">(Local, numeric format)</span></dt>
        <dd class="mono">{outputs.dateLocalNumeric}</dd>
        <dt>Date <span class="smaller">(UTC, ISO-8601)</span></dt>
        <dd class="mono">{outputs.dateUtcISO}</dd>
      </dl>

      {#if success}
        <table>
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
      {/if}
    </div>
  {:else}
    <h2>Input</h2>
    <div class="group">
      <div>
        <label for="uuid7-input">From UUID v7</label>
        <input
          id="uuid7-input"
          class="mono"
          type="text"
          size="40"
          placeholder="Enter UUID v7 here"
          bind:value={inputUuid7.value}
        />
        {#if inputUuid7.errorMessage}
          <span class="error-message" aria-live="polite">
            {inputUuid7.errorMessage}
          </span>
        {/if}

        <button
          class="button"
          onclick={() => inputUuid7.clear()}
          disabled={!inputUuid7.value}>Clear</button
        >
        <button class="button" onclick={() => inputUuid7.set_random_value()}
          >Generate</button
        >
      </div>
      <div>
        <label for="datetime-input-uuid7">From Date</label>
        <input
          id="datetime-input-uuid7"
          type="datetime-local"
          step="0.001"
          bind:value={inputDateTime.value}
        />
        {#if inputDateTime.errorMessage}
          <span class="error-message" aria-live="polite">
            {inputDateTime.errorMessage}
          </span>
        {/if}

        <button
          class="button"
          onclick={() => inputDateTime.clear()}
          disabled={!inputDateTime.value}>Clear</button
        >
        <button class="button" onclick={() => inputDateTime.set_current_date()}
          >Now</button
        >
      </div>
    </div>

    <h2>Output</h2>
    <div class="group">
      <dl class="margin-top-0">
        <dt>UUID v7</dt>
        <dd class="mono">
          <span class="uuid7-part-timestamp">{outputsUuid7.timestampHex.slice(0, 8)}{outputsUuid7.timestampHex.length > 8 ? "-" : ""}{outputsUuid7.timestampHex.slice(8, 12)}</span
          >{#if outputsUuid7.uuid7Formatted}-7{outputsUuid7.randA}-{outputsUuid7.variantNibble}{outputsUuid7.randB.slice(0, 3)}-{outputsUuid7.randB.slice(3)}{/if}
        </dd>
        <dt>Timestamp Hex</dt>
        <dd class="mono uuid7-part-timestamp">{outputsUuid7.timestampHex}</dd>
        <dt>rand_a</dt>
        <dd class="mono">{outputsUuid7.randA}</dd>
        <dt>rand_b</dt>
        <dd class="mono">{outputsUuid7.randB}</dd>
        <dt>Unix Timestamp <span class="smaller">(in milliseconds)</span></dt>
        <dd class="mono">{outputsUuid7.epochInMs}</dd>
        <dt>Date <span class="smaller">(Local, default format)</span></dt>
        <dd class="mono">{outputsUuid7.dateLocalDefault}</dd>
        <dt>Date <span class="smaller">(Local, numeric format)</span></dt>
        <dd class="mono">{outputsUuid7.dateLocalNumeric}</dd>
        <dt>Date <span class="smaller">(UTC, ISO-8601)</span></dt>
        <dd class="mono">{outputsUuid7.dateUtcISO}</dd>
      </dl>

      {#if successUuid7}
        <table>
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
      {/if}
    </div>
  {/if}
</main>

<style>
  .theme-toggle {
    float: right;
    margin: 0 8px;
  }

  .mode-toggle {
    margin-bottom: 8px;
  }

  .button.active {
    outline: 2px solid currentColor;
  }

  table {
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid gray;
    padding: 0.3em;
    white-space: nowrap;
  }

  th.no-border {
    border: none;
    background-color: transparent;
  }

  label {
    font-weight: bold;
  }

  dl {
    display: grid;
    grid-template-columns: max-content auto;
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

  label::after,
  dt::after {
    content: ": ";
    font-weight: normal;
  }

  dd {
    grid-column-start: 2;
  }
</style>
