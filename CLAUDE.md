# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ULID Timestamp Converter — a single-page web app that converts between ULID and timestamps. Hosted on GitHub Pages at https://ugai.github.io/ulid-timestamp-converter/.

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build (output: `dist/`)
- `npm run check` — Type-check Svelte and Node TypeScript configs
- `npm run preview` — Preview production build locally
- `npm run publish-gh-pages` — Build and deploy to GitHub Pages

No test framework is configured.

## Architecture

- **Svelte 5 + TypeScript + Vite** single-page app
- All application logic lives in `src/App.svelte` (single component, no routing)
- Uses `ulidx` library for ULID encode/decode operations
- Svelte 5 runes (`$state`, `$effect`) for reactivity
- Two input modes: ULID string → timestamp, or datetime → ULID timestamp part
- Output shows decoded timestamp in multiple formats plus Crockford Base32/decimal/binary/hex breakdown
- Global styles in `public/global.css`; component styles scoped in `App.svelte`
- Dark/light theme toggle via `body[dark-theme]` attribute
