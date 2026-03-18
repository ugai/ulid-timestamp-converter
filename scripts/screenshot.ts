/**
 * Take a screenshot of the app and save it to ./ss.png
 *
 * Usage:
 *   deno task screenshot            # headless (default)
 *   deno task screenshot --headed   # visible browser
 */

import { chromium } from "playwright";

const headed = Deno.args.includes("--headed");
const PORT = 54321;
const SERVER_URL = `http://localhost:${PORT}`;

// Start Vite dev server
const server = new Deno.Command("deno", {
  args: ["task", "dev", "--port", String(PORT)],
  stdout: "null",
  stderr: "null",
}).spawn();

// Poll until the dev server responds
const maxWait = 15_000;
const start = Date.now();
while (Date.now() - start < maxWait) {
  try {
    await fetch(SERVER_URL);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 200));
  }
}

// Verify server is actually up
try {
  await fetch(SERVER_URL);
} catch {
  console.error("Dev server did not start within timeout");
  server.kill();
  Deno.exit(1);
}

console.log(`Dev server ready at ${SERVER_URL}`);

try {
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(SERVER_URL);
  await page.waitForLoadState("networkidle");

  // Enter a sample ULID so the output sections are populated
  const input = page.locator("#id-input");
  await input.fill("01HYPE4G5RZJ0ZT9XFQCS0KPPK");
  // Wait for rendering to settle
  await page.waitForTimeout(300);

  // Capture full page
  await page.screenshot({ path: "ss.png", fullPage: true });
  console.log("Screenshot saved to ss.png");

  if (headed) {
    console.log("Press Ctrl+C to close...");
    await new Promise(() => {}); // keep open until killed
  }

  await browser.close();
} finally {
  server.kill();
}
