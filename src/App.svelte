<script>
  import { onMount } from "svelte";
  import { ulid, decodeTime } from "ulid";

  import Icon from "mdi-svelte";
  import { mdiGithub, mdiThemeLightDark } from "@mdi/js";

  const title = 'ULID DateTime converter';

  // dynamic theming {{{
  const darkTheme = "dark";
  const lightTheme = "light";
  let currentTheme;

  const darkThemeAttr = "dark-theme";
  const prefferedDark = "(prefers-color-scheme: dark)";
  const prefferedTheme = () => {
    return window.matchMedia(prefferedDark).matches ? darkTheme : lightTheme;
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

  let timestampPart = "";
  let epochInMilliseconds = "";
  let dateLocal = "";
  let dateLocalISO = "";
  let dateLocalDateTimeFormat = "";

  const clearOutputs = () => {
    timestampPart = "";
    epochInMilliseconds = "";
    dateLocal = "";
    dateLocalISO = "";
    dateLocalDateTimeFormat = "";
  };

  $: {
    const fullLength = 26;
    const timestampLength = 10;

    if (inputUlid) {
      try {
        let v = inputUlid.slice(); // clone
        if (v.length >= timestampLength && v.length < fullLength) {
          v += "0".repeat(fullLength - v.length); // fill random part
        }

        timestampPart = v.slice(0, timestampLength);

        epochInMilliseconds = decodeTime(v);

        dateLocal = new Date(epochInMilliseconds);
        dateLocalISO = dateLocal.toISOString();
        dateLocalDateTimeFormat = defaultDateTimeFormat.format(dateLocal);

        errorMessage = "";
      } catch (e) {
        clearOutputs();
        errorMessage = e.message;
      }
    } else {
      clearOutputs();
    }
  }

  const generateUlid = () => (inputUlid = ulid().toString());
  const clearUlid = () => (inputUlid = "");

  onMount(() => {
    currentTheme = prefferedTheme();
    generateUlid();
  });
</script>

<svelte:head>
	<title>{title}</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans&display=swap");

    body {
      font-family: "IBM Plex Sans", sans-serif;
      background-color: #f4f4f4; /* Gray 10 */
      color: #161616; /* Gray 100 */
    }

    .button {
      background-color: #e0e0e0; /* Gray 20 */
      color: #161616; /* Gray 100 */
    }

    body[dark-theme] {
      background-color: #262626; /* Gray 90 */
      color: #f4f4f4; /* Gray 10 */
    }

    body[dark-theme] *.button {
      background-color: #393939; /* Gray 80 */
      color: #f4f4f4; /* Gray 10 */
    }
  </style>
</svelte:head>

<main>
  <div class="theme-toggle">
    <button class="button" on:click={toggleTheme}>
      <Icon path={mdiThemeLightDark} />
    </button>
    <a class="button" href="https://github.com/ugai/ulid-datetime-converter/">
      <Icon path={mdiGithub} />
    </a>
  </div>

  <h1 class="title">{title}</h1>

  <h2 class="label-text">Input</h2>
  <div class="group">
    <div>
      <input
        class="ulid-input"
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
    </div>
    <button class="button" on:click={clearUlid} disabled={!inputUlid}
      >Clear</button
    >
    <button class="button" on:click={generateUlid}>Generate ULID</button>
  </div>

  <div class="group">
    <h2 class="label-text">Output</h2>
    <dl class="no-bottom-margin">
      <dt>ULID timestamp:</dt>
      <dd>{timestampPart}</dd>

      <dt>Epoch time (milliseconds):</dt>
      <dd>{epochInMilliseconds}</dd>

      <dt>Date:</dt>
      <dd>{dateLocal}</dd>

      <dt>Date (ISO format):</dt>
      <dd>{dateLocalISO}</dd>

      <dt>Date (DateTimeFormat):</dt>
      <dd>{dateLocalDateTimeFormat}</dd>
    </dl>
  </div>
</main>

<style>
  main {
    padding: 0 16px;
    max-width: 960px;
  }

  .theme-toggle {
    float: right;
    margin: 0 8px;
  }

  .error-message {
    color: #da1e28; /* Red 60 */
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
