// PSI baseline regression tests (issue #50 — errors-in-console, BP 100).
// The Cloudflare Web Analytics beacon was removed because its RUM POST is
// rejected at cloudflareinsights.com (404, no ACAO) on every page load,
// logging a CORS error + net::ERR_FAILED in every browser console
// (verified with CDP against production, 2026-11-18). Sevilla and Getafe
// never shipped the beacon and measure BP 100.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const layout = readFileSync(join(here, 'Layout.astro'), 'utf8');

describe('PSI #50 — no console-error sources in the layout', () => {
  it('does not load the Cloudflare Web Analytics beacon', () => {
    expect(layout).not.toMatch(/cloudflareinsights/);
    expect(layout).not.toMatch(/data-cf-beacon/);
    expect(layout).not.toMatch(/beacon\.min\.js/);
  });

  it('keeps no inline module scripts in <head> (only JSON-LD + analytics-free assets)', () => {
    // Guard: any future <head> script must not be a plain external module
    // like the beacon was. JSON-LD blocks are fine.
    const head = layout.slice(0, layout.indexOf('</head>'));
    const scripts = head.match(/<script\b[^>]*>/g) ?? [];
    const offending = scripts.filter(
      (tag) => /src=/.test(tag) && !/application\/ld\+json/.test(tag),
    );
    expect(offending).toEqual([]);
  });
});
