<script lang="ts">
  import { onMount } from "svelte";
  import { ulid, encodeTime, decodeTime } from "ulidx";

  const siteTitle = "ULID Timestamp Converter";
  const repositoryUrl = "https://github.com/ugai/ulid-timestamp-converter/";

  // dynamic theming {{{
  const darkTheme = "dark";
  const lightTheme = "light";
  let currentTheme: string = $state(lightTheme);

  const darkThemeAttr = "dark-theme";
  const preferredDark = "(prefers-color-scheme: dark)";
  const preferredTheme = () => {
    return window.matchMedia(preferredDark).matches ? darkTheme : lightTheme;
  };
  const updateTheme = (theme: string) => {
    if (theme == darkTheme) {
      document.body.setAttribute(darkThemeAttr, theme);
    } else {
      document.body.removeAttribute(darkThemeAttr);
    }
  };
  const toggleTheme = () => {
    currentTheme = currentTheme == darkTheme ? lightTheme : darkTheme;
  };

  $effect(() => {
    updateTheme(currentTheme);
  });
  // }}} dynamic theming

  const ULID_FULL_LENGTH = 26;
  const ULID_TIMESTAMP_LENGTH = 10;
  const CROCKFORD_BASE32_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const HEX_CHARS = "0123456789ABCDEF";

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
      this.value = ulid().toString();
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
      const base32Values = ulidTimestamp.split("");
      const decValues = [];
      const binValues = [];

      // base32 -> decimal, binary
      for (const [i, base32Char] of base32Values.entries()) {
        const dec = CROCKFORD_BASE32_CHARS.indexOf(base32Char);
        decValues.push(dec);

        let bin = "";
        for (let pos = 4; pos >= 0; pos--) {
          bin += (dec & (1 << pos)) > 0 ? "1" : "0";
        }
        binValues.push(bin);
      }
      binValues[0] = binValues[0].slice(2);
      const binAll = binValues.join("");

      this.base32Values = base32Values;
      this.decValues = decValues;
      this.binValues = binValues;
      this.binAll = binAll;

      // binary -> hexadecimal
      let hexAll = "";
      let total = 0;
      for (const [i, binChar] of binAll.split("").reverse().entries()) {
        const pos = i % 4;
        if (pos === 0) {
          total = 0;
        }
        if (binChar == "1") {
          total += 1 << pos;
        }
        if (pos === 3) {
          hexAll = HEX_CHARS[total] + hexAll;
        }
      }

      this.hexAll = hexAll;
    }
  }

  const inputUlid = new UlidInputField();
  const inputDateTime = new DateTimeInputField();
  const outputs = new OutputFields();
  let success = $state(false);

  $effect(() => convertFromUlid(inputUlid.value));
  $effect(() => convertFromDateTime(inputDateTime.value));

  const convertFromUlid = (v: string) => {
    if (!v) {
      outputs.clear();
      success = false;
      return;
    }

    try {
      v = v.toUpperCase(); // clone
      if (v.length >= ULID_TIMESTAMP_LENGTH && v.length < ULID_FULL_LENGTH) {
        v += "0".repeat(ULID_FULL_LENGTH - v.length); // fill randomness part
      }

      const epochMs = decodeTime(v);
      const tsPart = v.slice(0, ULID_TIMESTAMP_LENGTH);
      const rsPart = v.slice(ULID_TIMESTAMP_LENGTH);
      outputs.update(tsPart, rsPart, epochMs);

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
      const rsPart = ulid().toString().slice(ULID_TIMESTAMP_LENGTH);
      outputs.update(tsPart, rsPart, epochMs);

      inputDateTime.errorMessage = "";
      success = true;
    } catch (e: unknown) {
      outputs.clear();
      if (e instanceof Error) inputDateTime.errorMessage = e.message;
      success = false;
    }
  };

  onMount(() => {
    currentTheme = preferredTheme();
    inputUlid.set_random_value();
  });
</script>

<main>
  <div class="theme-toggle">
    <button class="button" onclick={toggleTheme} aria-label="Toggle theme">
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
        disabled={!inputUlid}>Clear</button
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
        disabled={!inputDateTime}>Clear</button
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
</main>

<style>
  .theme-toggle {
    float: right;
    margin: 0 8px;
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
