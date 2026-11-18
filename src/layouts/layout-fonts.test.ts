// PSI baseline regression tests (issue #51 — Speed Index of the home).
// Paint-timeline evidence (CDP, throttled 4G + CPU 4x, 2026-11-18): the
// whole viewport repaints at ~2.4s when the custom fonts arrive and apply
// (font-display: swap) — that late full repaint is the Speed Index driver
// (SI 6,7s in the PSI baseline vs 3,9s for sevilla). The fix: preload the
// two latin font files every page renders above the fold so the custom
// font paints with the first paint instead of a second one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const layout = readFileSync(join(here, 'Layout.astro'), 'utf8');

// The two files fonts.css actually renders on every page: DM Sans latin
// variable (body, weights 300-700 share one file) and Plus Jakarta Sans
// latin (headings, weights 400-700 share one file).
const criticalFonts = [
  '/fonts/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K4.woff2',
  '/fonts/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2',
];

describe('PSI #51 — critical fonts are preloaded', () => {
  it.each(criticalFonts)('preloads %s with as=font and crossorigin', (href) => {
    const re = new RegExp(
      `<link[^>]*rel="preload"[^>]*href="${href.replace(/[/.]/g, '\\$&')}"[^>]*/?>`,
    );
    const match = layout.match(re);
    expect(match).not.toBeNull();
    const tag = match?.[0] ?? '';
    expect(tag).toMatch(/as="font"/);
    expect(tag).toMatch(/type="font\/woff2"/);
    expect(tag).toMatch(/crossorigin/);
  });

  it.each(criticalFonts)('%s exists in public/fonts', (href) => {
    expect(() => readFileSync(join(here, '..', '..', 'public', href.replace(/^\//, '')))).not.toThrow();
  });

  it('does not preload latin-ext/vietnamese/cyrillic subsets (wasted bytes)', () => {
    const preloads = layout.match(/<link[^>]*rel="preload"[^>]*>/g) ?? [];
    const fontPreloads = preloads.filter((tag) => /as="font"/.test(tag));
    expect(fontPreloads).toHaveLength(2);
  });
});
