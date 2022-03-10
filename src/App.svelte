<script>
  import { onMount } from "svelte";
  import { ulid, encodeTime, decodeTime } from "ulid";
  import { MetaTags } from "svelte-meta-tags";
  import Icon from "mdi-svelte";
  import { mdiGithub, mdiThemeLightDark } from "@mdi/js";
  import { validate_store } from "svelte/internal";

  const siteTitle = "ULID DateTime Converter";
  const siteDescription = "An online datetime converter for the ULID";
  const siteCanonicalLink = "https://ugai.github.io/ulid-datetime-converter/";
  const repositoryUrl = "https://github.com/ugai/ulid-datetime-converter/";

  // dynamic theming {{{
  const darkTheme = "dark";
  const lightTheme = "light";
  let currentTheme;

  const darkThemeAttr = "dark-theme";
  const preferredDark = "(prefers-color-scheme: dark)";
  const preferredTheme = () => {
    return window.matchMedia(preferredDark).matches ? darkTheme : lightTheme;
  };
  const updateTheme = (theme) => {
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
  let modifiedUlid = "";
  let timestampPart = "";
  let epochInMilliseconds = "";
  let dateLocal = "";
  let dateLocalISO = "";
  let dateLocalNumeric = "";

  let base32Values = [];
  let decValues = [];
  let binValues = [];
  let binAll = "";
  let hexAll = "";

  const clearOutput = () => {
    modifiedUlid = "";
    timestampPart = "";
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

  const updateOutput = (timestampPart, epochInMilliseconds) => {
    dateLocal = new Date(epochInMilliseconds);
    dateLocalISO = dateLocal.toISOString();
    dateLocalNumeric = defaultDateTimeFormat.format(dateLocal);

    // my parser {{{
    base32Values = timestampPart.split("");
    decValues = [];
    binValues = [];

    // base32 -> decimal, binary
    for (const [i, hexChar] of base32Values.entries()) {
      const dec = crockfordBase32.indexOf(hexChar);
      decValues.push(dec);

      let bin = "";
      for (let pos = 4; pos >= 0; pos--) {
        bin += (dec & (1 << pos)) > 0 ? "1" : "0";
      }
      binValues.push(bin);
    }
    binValues[0] = binValues[0].slice(2);

    binAll = binValues.join("");

    // binary -> hex
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

  const convertFromUlid = (v) => {
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

      modifiedUlid = v;
      timestampPart = v.slice(0, timestampLength);
      epochInMilliseconds = decodeTime(v);

      updateOutput(timestampPart, epochInMilliseconds);

      inputUlidErrorMessage = "";
      success = true;
    } catch (e) {
      clearOutput();
      inputUlidErrorMessage = e.message;
      success = false;
    }
  };

  const convertFromDateTime = (v) => {
    if (!v) {
      clearOutput();
      success = false;
      return;
    }

    try {
      epochInMilliseconds = new Date(v).getTime();
      timestampPart = encodeTime(epochInMilliseconds, timestampLength);
      const randompart = ulid().toString().slice(timestampLength);
      modifiedUlid = timestampPart + randompart;

      updateOutput(timestampPart, epochInMilliseconds);

      inputDateTimeErrorMessage = "";
      success = true;
    } catch (e) {
      clearOutput();
      inputDateTimeErrorMessage = e.message;
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
      <Icon path={mdiThemeLightDark} />
    </button>
    <a class="button" target="_blank" href={repositoryUrl} aria-label="GitHub">
      <Icon path={mdiGithub} />
    </a>
  </div>

  <h1 class="title">{siteTitle}</h1>

  <h2>Input</h2>
  <div class="group">
    <input
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
    <button
      class="button"
      on:click={() => convertFromUlid(inputUlid)}
      disabled={!inputUlid}
    >
      Convert
    </button>

    <div>
      <button class="button" on:click={clearUlid} disabled={!inputUlid}>
        Clear
      </button>
      <button class="button" on:click={generateUlid}> Generate ULID </button>
    </div>
  </div>
  <div class="group">
    <input
      type="datetime-local"
      step="0.001"
      bind:value={inputDateTime}
    />
    {#if inputDateTimeErrorMessage}
      <span class="error-message" aria-live="polite">
        {inputDateTimeErrorMessage}
      </span>
    {/if}
    <button
      class="button"
      on:click={() => convertFromDateTime(inputDateTime)}
      disabled={!inputDateTime}
    >
      Convert
    </button>
    <div>
      <button class="button" on:click={clearDateTime} disabled={!inputDateTime}>
        Clear
      </button>
      <button class="button" on:click={setDateTimeNow}> Set Now </button>
    </div>
  </div>

  <h2>Output</h2>
  <div class="group">
    <dl class="margin-top-0">
      <dt>ULID</dt>
      <dd class="mono">{modifiedUlid}</dd>

      <dt>ULID timestamp</dt>
      <dd class="mono">{timestampPart}</dd>

      <dt>Epoch time (milliseconds)</dt>
      <dd class="mono">{epochInMilliseconds}</dd>

      <dt>Date</dt>
      <dd class="mono">{dateLocal}</dd>

      <dt>Date (UTC ISO-8601)</dt>
      <dd class="mono">{dateLocalISO}</dd>

      <dt>Date (local numeric)</dt>
      <dd class="mono">{dateLocalNumeric}</dd>
    </dl>

    {#if success}
      <table>
        <thead class="text-center">
          <tr>
            <th class="no-border" />
            <th colspan={timestampLength}>timestamp (48-bit)</th>
          </tr>
        </thead>
        <tbody class="mono">
          <tr>
            <th
              ><a target="_blank" href="http://www.crockford.com/base32.html"
                >base32</a
              ></th
            >
            {#each base32Values as base32Char}
              <td class="text-right">{base32Char}</td>
            {/each}
          </tr>
          <tr>
            <th>dec</th>
            {#each decValues as dec}
              <td class="text-right">{dec}</td>
            {/each}
          </tr>
          <tr>
            <th rowspan="2">bin</th>
            {#each binValues as bin}
              <td class="text-right small">{bin}</td>
            {/each}
          </tr>
          <tr>
            <td class="text-center small" colspan={timestampLength}>{binAll}</td
            >
          </tr>
          <tr>
            <th>hex</th>
            <td class="text-center small" colspan={timestampLength}>{hexAll}</td
            >
          </tr>
        </tbody>
      </table>
    {/if}
  </div>
</main>

<MetaTags
  title={siteTitle}
  description={siteDescription}
  canonical={siteCanonicalLink}
/>

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

  dl {
    display: grid;
    grid-template-columns: max-content auto;
  }

  dt {
    grid-column-start: 1;
  }

  dd {
    grid-column-start: 2;
  }
</style>
