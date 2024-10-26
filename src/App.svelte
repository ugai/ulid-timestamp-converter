<script lang="ts">
  import { onMount } from "svelte";
  import { ulid, encodeTime, decodeTime } from "ulidx";

  const siteTitle = "ULID Timestamp Converter";
  const repositoryUrl = "https://github.com/ugai/ulid-timestamp-converter/";

  // dynamic theming {{{
  const darkTheme = "dark";
  const lightTheme = "light";
  let currentTheme: string = lightTheme;

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

  $: updateTheme(currentTheme);
  // }}} dynamic theming

  const fullLength = 26;
  const timestampLength = 10;
  const randomnessLength = 16;
  const crockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const hex = "0123456789ABCDEF";

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

  let inputUlid = "";
  let inputUlidErrorMessage = "";

  let inputDateTime = "";
  let inputDateTimeErrorMessage = "";

  let success = false;
  let timestampPart = "";
  let randomPart = "";
  let epochInMilliseconds = "";
  let dateLocal = "";
  let dateLocalISO = "";
  let dateLocalNumeric = "";

  let base32Values: string[] = [];
  let decValues: number[] = [];
  let binValues: string[] = [];
  let binAll = "";
  let hexAll = "";

  const clearOutput = () => {
    timestampPart = "";
    randomPart = "";
    epochInMilliseconds = "";
    dateLocal = "";
    dateLocalISO = "";
    dateLocalNumeric = "";

    base32Values = [];
    decValues = [];
    binValues = [];
    binAll = "";
    hexAll = "";
  };

  const updateOutput = (timestampPart: string, epochInMilliseconds: string) => {
    const dt = new Date(Number(epochInMilliseconds));
    dateLocal = dt.toString();
    dateLocalISO = dt.toISOString();
    dateLocalNumeric = defaultDateTimeFormat.format(dt);

    // my parser {{{
    base32Values = timestampPart.split("");
    decValues = [];
    binValues = [];

    // base32 -> decimal, binary
    for (const [i, base32Char] of base32Values.entries()) {
      const dec = crockfordBase32.indexOf(base32Char);
      decValues.push(dec);

      let bin = "";
      for (let pos = 4; pos >= 0; pos--) {
        bin += (dec & (1 << pos)) > 0 ? "1" : "0";
      }
      binValues.push(bin);
    }
    binValues[0] = binValues[0].slice(2);
    binAll = binValues.join("");

    // binary -> hexadecimal
    hexAll = "";
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
        hexAll = hex[total] + hexAll;
      }
    }
    // }}} my parser
  };

  $: convertFromUlid(inputUlid);
  $: convertFromDateTime(inputDateTime);

  const convertFromUlid = (v: string) => {
    if (!v) {
      clearOutput();
      success = false;
      return;
    }

    try {
      v = v.toUpperCase(); // clone
      if (v.length >= timestampLength && v.length < fullLength) {
        v += "0".repeat(fullLength - v.length); // fill random part
      }

      timestampPart = v.slice(0, timestampLength);
      randomPart = v.slice(timestampLength);
      epochInMilliseconds = decodeTime(v).toString();

      updateOutput(timestampPart, epochInMilliseconds);

      inputUlidErrorMessage = "";
      success = true;
    } catch (e: unknown) {
      clearOutput();
      if (e instanceof Error) inputUlidErrorMessage = e.message;
      success = false;
    }
  };

  const convertFromDateTime = (v: string) => {
    if (!v) {
      clearOutput();
      success = false;
      return;
    }

    try {
      epochInMilliseconds = new Date(v).getTime().toString();
      timestampPart = encodeTime(Number(epochInMilliseconds), timestampLength);
      randomPart = ulid().toString().slice(timestampLength);

      updateOutput(timestampPart, epochInMilliseconds);

      inputDateTimeErrorMessage = "";
      success = true;
    } catch (e: unknown) {
      clearOutput();
      if (e instanceof Error) inputUlidErrorMessage = e.message;
      success = false;
    }
  };

  const generateUlid = () => (inputUlid = ulid().toString());
  const clearUlid = () => (inputUlid = "");

  const setDateTimeNow = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    inputDateTime = now.toISOString().slice(0, -1);
  };
  const clearDateTime = () => (inputDateTime = "");

  onMount(() => {
    currentTheme = preferredTheme();
    generateUlid();
  });
</script>

<main>
  <div class="theme-toggle">
    <button class="button" on:click={toggleTheme} aria-label="Toggle theme">
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
        bind:value={inputUlid}
      />
      {#if inputUlidErrorMessage}
        <span class="error-message" aria-live="polite">
          {inputUlidErrorMessage}
        </span>
      {/if}

      <button class="button" on:click={clearUlid} disabled={!inputUlid}
        >Clear</button
      >
      <button class="button" on:click={generateUlid}>Generate</button>
    </div>
    <div>
      <label for="datetime-input">From Date</label>
      <input
        id="datetime-input"
        type="datetime-local"
        step="0.001"
        bind:value={inputDateTime}
      />
      {#if inputDateTimeErrorMessage}
        <span class="error-message" aria-live="polite">
          {inputDateTimeErrorMessage}
        </span>
      {/if}

      <button class="button" on:click={clearDateTime} disabled={!inputDateTime}
        >Clear</button
      >
      <button class="button" on:click={setDateTimeNow}>Now</button>
    </div>
  </div>

  <h2>Output</h2>
  <div class="group">
    <dl class="margin-top-0">
      <dt>ULID</dt>
      <dd class="mono">
        <span class="ulid-part-timestamp">{timestampPart}</span><span
          class="ulid-part-random">{randomPart}</span
        >
      </dd>
      <dt>ULID Timestamp</dt>
      <dd class="mono ulid-part-timestamp">{timestampPart}</dd>
      <dt>Unix Timestamp <span class="smaller">(in milliseconds)</span></dt>
      <dd class="mono">{epochInMilliseconds}</dd>
      <dt>Date <span class="smaller">(Local, default format)</span></dt>
      <dd class="mono">{dateLocal}</dd>
      <dt>Date <span class="smaller">(Local, numeric format)</span></dt>
      <dd class="mono">{dateLocalNumeric}</dd>
      <dt>Date <span class="smaller">(UTC, ISO-8601)</span></dt>
      <dd class="mono">{dateLocalISO}</dd>
    </dl>

    {#if success}
      <table>
        <thead class="text-center">
          <tr>
            <th class="no-border"></th>
            <th colspan={timestampLength}>Timestamp (48-bit)</th>
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
            {#each base32Values as base32Char}
              <td class="text-right ulid-part-timestamp">{base32Char}</td>
            {/each}
          </tr>
          <tr>
            <th>Decimal</th>
            {#each decValues as dec}
              <td class="text-right">{dec}</td>
            {/each}
          </tr>
          <tr>
            <th rowspan="2">Binary</th>
            {#each binValues as bin}
              <td class="text-right small">{bin}</td>
            {/each}
          </tr>
          <tr>
            <td class="text-center small" colspan={timestampLength}>{binAll}</td
            >
          </tr>
          <tr>
            <th>Hexadecimal</th>
            <td class="text-center small" colspan={timestampLength}>{hexAll}</td
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
