# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ULID / UUID v7 Timestamp Converter — a single-page web app that converts between ULID, UUID v7, and timestamps. Hosted on GitHub Pages at https://ugai.github.io/ulid-timestamp-converter/.

## Commands

Requires Deno 2.x. Tasks are defined in `package.json` and run via `deno task`.

- `deno install` — Install npm dependencies into `node_modules`
- `deno task dev` — Start Vite dev server
- `deno task build` — Production build (output: `dist/`)
- `deno task check` — Type-check Svelte and Node TypeScript configs
- `deno task preview` — Preview production build locally
- `deno task publish-gh-pages` — Build and deploy to GitHub Pages

- `npm test` — Run Vitest unit tests (use npm rather than Deno to avoid version mismatches)

## Architecture

- **Svelte 5 + TypeScript + Vite** single-page app
- Pure ULID parsing/decoding logic lives in `src/lib/ulid.ts`
- UI component in `src/App.svelte` (single component, no routing)
- Uses `ulidx` library for ULID encode/decode operations
- Svelte 5 runes (`$state`, `$effect`) for reactivity
- Two input modes: ULID string → timestamp, or datetime → ULID timestamp part
- Output shows decoded timestamp in multiple formats plus Crockford Base32/decimal/binary/hex breakdown
- Global styles in `public/global.css`; component styles scoped in `App.svelte`
- Dark/light theme toggle via `body[dark-theme]` attribute
