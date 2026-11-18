// PSI baseline regression tests (issue #49 — color contrast, a11y ≥ 98).
// The tokens live in Layout.astro :root; this file pins the WCAG math so a
// future palette tweak cannot silently reintroduce the contrast failures
// found by Lighthouse on 2026-11-17 (a11y 96 on 14/14 pages).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, '..', rel), 'utf8');

/** Parse the first `--token: <value>;` declaration of a CSS source string. */
function token(css: string, name: string): string {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1].trim();
}

/** hsl(H,S%,L%) | #RRGGBB → [r,g,b] 0-255 */
function toRgb(value: string): [number, number, number] {
  const hsl = value.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (hsl) {
    const h = Number(hsl[1]), s = Number(hsl[2]) / 100, l = Number(hsl[3]) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  throw new Error(`unsupported color value: ${value}`);
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.x contrast ratio between two color strings. */
function contrast(a: string, b: string): number {
  const l1 = luminance(toRgb(a));
  const l2 = luminance(toRgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('PSI #49 — WCAG contrast of the Alicante palette', () => {
  const layout = read('layouts/Layout.astro');
  const root = layout.slice(layout.indexOf('<style is:global>'), layout.indexOf('</style>'));

  // Surfaces where muted/orange text is rendered (same values as the CSS).
  const white = '#FFFFFF';
  const warmBg = token(root, 'color-warm-bg');          // warm section cards
  const creamBg = token(root, 'color-bg');              // page background
  const darkBg = token(root, 'color-dark-bg');          // dark heroes

  it('muted text passes AA on white, cream and warm surfaces', () => {
    const muted = token(root, 'color-fg-muted');
    expect(contrast(muted, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, creamBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, warmBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('strong orange works as text on light and as background under white text', () => {
    const strong = token(root, 'color-primary-strong');
    expect(contrast(strong, white)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(white, strong)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(strong, creamBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(strong, warmBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('button hover keeps white text above AA', () => {
    const hover = token(root, 'color-primary-strong-hover');
    expect(contrast(white, hover)).toBeGreaterThanOrEqual(4.5);
  });

  it('destructive (form errors, 14px) passes AA on white', () => {
    const destructive = token(root, 'color-destructive');
    expect(contrast(destructive, white)).toBeGreaterThanOrEqual(4.5);
  });

  it('bright orange on dark heroes keeps passing (eyebrow stays legible)', () => {
    // .hero .eyebrow overrides the strong default on dark heroes; the bright
    // token must not regress there.
    expect(contrast(token(root, 'color-primary'), darkBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('text-carrying orange on light surfaces uses the strong token', () => {
    // Files flagged by the contrast audit (2026-11-18) whose orange text sits
    // on white/cream/warm backgrounds.
    const cases: Array<[string, RegExp]> = [
      ['layouts/Layout.astro', /\.btn\s*\{[^}]*background:\s*var\(--color-primary-strong\)/],
      ['layouts/Layout.astro', /\.btn-outline\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['layouts/Layout.astro', /a\s*\{\s*\n?\s*color:\s*var\(--color-primary-strong\)/],
      ['layouts/Layout.astro', /\.skip-link\s*\{[^}]*background:\s*var\(--color-primary-strong\)/],
      ['layouts/Layout.astro', /\.related-link\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/VehicleCard.astro', /\.vehicle-group\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/VehicleCard.astro', /\.price-amount\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/PricingTable.astro', /\.price-amount\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/common/BlogCard.astro', /\.blog-category\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/common/BlogCard.astro', /\.blog-link\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['components/HourlyPricingTable.astro', /color:\s*var\(--color-primary-strong\)/],
      ['components/Header.astro', /\.primary-nav a\.active\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['pages/blog/[slug].astro', /\.blog-category\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['pages/alquiler-furgonetas-san-juan-alicante.astro', /\.eyebrow\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['pages/alquiler-furgonetas-san-vicente.astro', /\.eyebrow\s*\{[^}]*color:\s*var\(--color-primary-strong\)/],
      ['pages/furgonetas-mudanzas-alicante.astro', /\.btn-primary\s*\{[^}]*background:\s*var\(--color-primary-strong\)/],
      ['pages/furgonetas-reformas-construccion-alicante.astro', /\.btn-primary\s*\{[^}]*background:\s*var\(--color-primary-strong\)/],
    ];
    for (const [file, re] of cases) {
      expect({ file, matches: re.test(read(file)) }).toEqual({ file, matches: true });
    }
  });

  it('dark-hero eyebrows keep the bright orange (override present)', () => {
    // .hero/.blog-hero eyebrows live on dark backgrounds: the bright token
    // passes there (the strong default is for light surfaces).
    expect(read('pages/index.astro')).toMatch(/\.hero \.eyebrow\s*\{[^}]*color:\s*var\(--color-primary\)/);
    expect(read('pages/alquiler-furgonetas-por-horas-alicante.astro')).toMatch(/\.hero \.eyebrow\s*\{[^}]*color:\s*var\(--color-primary\)/);
    expect(read('pages/blog/index.astro')).toMatch(/\.blog-hero \.eyebrow\s*\{[^}]*color:\s*var\(--color-primary\)/);
  });

  it('mobile-nav WhatsApp button keeps white text on the strong orange', () => {
    expect(read('components/Header.astro')).toMatch(/\.mobile-nav a\.btn-primary\s*\{[^}]*color:\s*var\(--color-primary-fg\)/);
  });

  it('how-it-works step numbers use the strong orange under white text', () => {
    expect(read('pages/alquiler-furgonetas-por-horas-alicante.astro')).toMatch(
      /\.step-number\s*\{[^}]*background:\s*var\(--color-primary-strong\)/,
    );
  });

  it('QuoteForm tokens follow the accessible palette', () => {
    expect(read('styles/global.css')).toMatch(/--ld-link:\s*var\(--color-primary-strong\)/);
  });
});
