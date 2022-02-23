<script>
  import { onMount } from "svelte";
  import { ulid, decodeTime } from "ulid";

  import Icon from "mdi-svelte";
  import { mdiGithub, mdiThemeLightDark } from "@mdi/js";

  const title = "ULID DateTime converter";

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
  const defaultDateTimeFormat = new Intl.DateTimeFormat([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  let inputUlid = "";
  let errorMessage = "";

  let success = false;
  let modifiedUlid = "";
  let timestampPart = "";
  let epochInMilliseconds = "";
  let dateLocal = "";
  let dateLocalISO = "";
  let dateLocalDateTimeFormat = "";

  let base32Values = [];
  let decValues = [];
  let binValues = [];
  let binAll = "";
  let hexAll = "";

  const clearOutputs = () => {
    modifiedUlid = "";
    timestampPart = "";
    epochInMilliseconds = "";
    dateLocal = "";
    dateLocalISO = "";
    dateLocalDateTimeFormat = "";

    base32Values = [];
    decValues = [];
    binValues = [];
    binAll = "";
    hexAll = "";
  };

  $: {
    if (inputUlid) {
      try {
        let v = inputUlid.toUpperCase(); // clone
        if (v.length >= timestampLength && v.length < fullLength) {
          v += "0".repeat(fullLength - v.length); // fill random part
        }

        modifiedUlid = v;
        timestampPart = v.slice(0, timestampLength);

        epochInMilliseconds = decodeTime(v);

        dateLocal = new Date(epochInMilliseconds);
        dateLocalISO = dateLocal.toISOString();
        dateLocalDateTimeFormat = defaultDateTimeFormat.format(dateLocal);

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

        errorMessage = "";
        success = true;
      } catch (e) {
        clearOutputs();
        errorMessage = e.message;
        success = false;
      }
    } else {
      clearOutputs();
      success = false;
    }
  }

  const generateUlid = () => (inputUlid = ulid().toString());
  const clearUlid = () => (inputUlid = "");

  onMount(() => {
    currentTheme = preferredTheme();
    generateUlid();
  });
</script>

<svelte:head>
  <title>{title}</title>
  <style>
  </style>
</svelte:head>

<main>
  <div class="theme-toggle">
    <button class="button" on:click={toggleTheme} aria-label="Toggle theme">
      <Icon path={mdiThemeLightDark} />
    </button>
    <a
      class="button"
      target="_blank"
      href="https://github.com/ugai/ulid-datetime-converter/"
      aria-label="GitHub"
    >
      <Icon path={mdiGithub} />
    </a>
  </div>

  <h1 class="title">{title}</h1>

  <h2>Input</h2>
  <div class="group">
    <input
      class="mono"
      type="text"
      size="40"
      placeholder="Enter ULID here"
      bind:value={inputUlid}
    />
    {#if errorMessage}
      <span class="error-message" aria-live="polite">
        {errorMessage}
      </span>
    {/if}

    <div>
      <button class="button" on:click={clearUlid} disabled={!inputUlid}>
        Clear
      </button>
      <button class="button" on:click={generateUlid}> Generate ULID </button>
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

      <dt>Date (ISO format)</dt>
      <dd class="mono">{dateLocalISO}</dd>

      <dt>Date (DateTimeFormat)</dt>
      <dd class="mono">{dateLocalDateTimeFormat}</dd>
    </dl>

    {#if success}
      <table>
        <thead class="text-center">
          <tr>
            <th class="no-border" />
            <th colspan={timestampLength}>ULID timestamp (48-bit)</th>
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
